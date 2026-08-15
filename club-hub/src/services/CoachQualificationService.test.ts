import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { Staff } from "@/entities/Staff";
import { Team } from "@/entities/Team";
import { TeamAffiliation } from "@/entities/TeamAffiliation";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));
vi.mock("@/lib/notificationClient", () => ({ notify: vi.fn(async () => undefined) }));

beforeEach(async () => { dataSource = await createTestDataSource(); });
afterEach(async () => { await dataSource.destroy(); });

async function seedTeam(clubId: string): Promise<void> {
  const repo = dataSource.getRepository(Team);
  await repo.save(repo.create({ id: clubId, nom: "Club", teamType: "club", sport: "football", ageCategory: "seniors" }));
}

async function seedStaff(clubId: string): Promise<Staff> {
  await seedTeam(clubId);
  const repo = dataSource.getRepository(Staff);
  return repo.save(repo.create({ teamId: clubId, firstNameFr: "Sami", lastNameFr: "Ben Ali", staffType: "COACH", birthDate: new Date("1980-01-01") }));
}

async function seedAffiliation(clubId: string): Promise<void> {
  const repo = dataSource.getRepository(TeamAffiliation);
  await repo.save(repo.create({ teamId: clubId, federationId: "fed-1", leagueId: null, status: "ACTIVE" }));
}

describe("CoachQualificationService", () => {
  it("submits a PENDING qualification scoped to the club's affiliation", async () => {
    const { submitCoachQualificationForClub, listCoachQualificationsForClub } = await import("./CoachQualificationService");
    const staff = await seedStaff("club-1");
    await seedAffiliation("club-1");
    const qualification = await submitCoachQualificationForClub("club-1", { staffId: String(staff.id), qualificationType: "CAF_A" }, { userId: "u1", role: "CLUB_ADMIN" });
    expect(qualification.status).toBe("PENDING");
    expect(qualification.federationId).toBe("fed-1");
    const items = await listCoachQualificationsForClub("club-1");
    expect(items).toHaveLength(1);
  });

  it("refuses a staff member outside the club", async () => {
    const { submitCoachQualificationForClub } = await import("./CoachQualificationService");
    const staff = await seedStaff("club-1");
    await seedAffiliation("club-2");
    await expect(submitCoachQualificationForClub("club-2", { staffId: String(staff.id), qualificationType: "CAF_A" }, { userId: "u1", role: "CLUB_ADMIN" })).rejects.toThrow(/introuvable/i);
  });

  it("refuses to submit without an active affiliation", async () => {
    const { submitCoachQualificationForClub } = await import("./CoachQualificationService");
    const staff = await seedStaff("club-3");
    await expect(submitCoachQualificationForClub("club-3", { staffId: String(staff.id), qualificationType: "CAF_A" }, { userId: "u1", role: "CLUB_ADMIN" })).rejects.toThrow(/affiliation/i);
  });
});
