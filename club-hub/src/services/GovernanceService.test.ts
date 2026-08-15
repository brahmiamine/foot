import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { TeamAffiliation } from "@/entities/TeamAffiliation";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));
vi.mock("@/lib/notificationClient", () => ({ notify: vi.fn(async () => undefined) }));

beforeEach(async () => { dataSource = await createTestDataSource(); });
afterEach(async () => { await dataSource.destroy(); });

async function seedAffiliation(clubId: string): Promise<void> {
  const repo = dataSource.getRepository(TeamAffiliation);
  await repo.save(repo.create({ teamId: clubId, federationId: "fed-1", leagueId: null, status: "ACTIVE" }));
}

describe("GovernanceService", () => {
  it("creates a DRAFT mandate scoped to the club's active affiliation", async () => {
    const { createBoardMandateForClub } = await import("./GovernanceService");
    await seedAffiliation("club-1");
    const mandate = await createBoardMandateForClub("club-1", { startsAt: "2026-01-01", endsAt: "2030-01-01" }, { userId: "u1", role: "CLUB_ADMIN" });
    expect(mandate.status).toBe("DRAFT");
    expect(mandate.federationId).toBe("fed-1");
  });

  it("refuses to create a mandate without an active affiliation", async () => {
    const { createBoardMandateForClub } = await import("./GovernanceService");
    await expect(createBoardMandateForClub("club-without-affiliation", { startsAt: "2026-01-01", endsAt: "2030-01-01" }, { userId: "u1", role: "CLUB_ADMIN" })).rejects.toThrow(/affiliation/i);
  });

  it("adds members unapproved by default, pending federation review", async () => {
    const { createBoardMandateForClub, addBoardMember, getBoardMandateBundleForClub } = await import("./GovernanceService");
    await seedAffiliation("club-2");
    const actor = { userId: "u1", role: "CLUB_ADMIN" };
    const mandate = await createBoardMandateForClub("club-2", { startsAt: "2026-01-01", endsAt: "2030-01-01" }, actor);
    await addBoardMember("club-2", mandate.id, { personName: "Amine B.", role: "PRESIDENT", startsAt: "2026-01-01" }, actor);
    const bundle = await getBoardMandateBundleForClub("club-2", mandate.id);
    expect(bundle.members).toHaveLength(1);
    expect(bundle.members[0].federationApproved).toBe(false);
  });

  it("scopes mandates strictly to their own club", async () => {
    const { createBoardMandateForClub, getBoardMandateBundleForClub } = await import("./GovernanceService");
    await seedAffiliation("club-3");
    const mandate = await createBoardMandateForClub("club-3", { startsAt: "2026-01-01", endsAt: "2030-01-01" }, { userId: "u1", role: "CLUB_ADMIN" });
    await expect(getBoardMandateBundleForClub("club-4", mandate.id)).rejects.toThrow(/introuvable/i);
  });
});
