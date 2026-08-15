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

describe("FinancialComplianceService", () => {
  it("creates a single DRAFT dossier per club/season and reuses it on re-save", async () => {
    const { upsertFinancialComplianceDraft, listFinancialComplianceForClub } = await import("./FinancialComplianceService");
    await seedAffiliation("club-1");
    const actor = { userId: "u1", role: "CLUB_ADMIN" };
    const first = await upsertFinancialComplianceDraft("club-1", "season-1", { playerDebts: "1000" }, actor);
    const second = await upsertFinancialComplianceDraft("club-1", "season-1", { playerDebts: "2000" }, actor);
    expect(second.id).toBe(first.id);
    expect(Number(second.playerDebts)).toBe(2000);
    const items = await listFinancialComplianceForClub("club-1");
    expect(items).toHaveLength(1);
  });

  it("refuses to create a dossier without an active affiliation", async () => {
    const { upsertFinancialComplianceDraft } = await import("./FinancialComplianceService");
    await expect(upsertFinancialComplianceDraft("club-without-affiliation", "season-1", {}, { userId: "u1", role: "CLUB_ADMIN" })).rejects.toThrow(/affiliation/i);
  });
});

// submitFinancialCompliance() prend un verrou pessimiste (setLock("pessimistic_write")),
// non supporté par le driver SQLite en mémoire utilisé ici (voir createTestDataSource) :
// son comportement (SUBMITTED, blocage des éditions/re-soumissions) est couvert par les
// règles pures assertFinancialComplianceTransition/canEditFinancialCompliance, testées
// dans federation-hub/src/lib/financialCompliance.test.ts (module partagé identique).
