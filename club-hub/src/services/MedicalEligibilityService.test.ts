import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { Player } from "@/entities/Player";
import { Team } from "@/entities/Team";
import { TeamAffiliation } from "@/entities/TeamAffiliation";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));
vi.mock("@/lib/notificationClient", () => ({ notify: vi.fn(async () => undefined) }));

beforeEach(async () => { dataSource = await createTestDataSource(); });
afterEach(async () => { await dataSource.destroy(); });

async function seedClub(clubId: string): Promise<void> {
  const teamRepo = dataSource.getRepository(Team);
  await teamRepo.save(teamRepo.create({ id: clubId, nom: "Club", teamType: "club", sport: "football", ageCategory: "seniors" }));
  const affiliationRepo = dataSource.getRepository(TeamAffiliation);
  await affiliationRepo.save(affiliationRepo.create({ teamId: clubId, federationId: "fed-1", leagueId: null, status: "ACTIVE" }));
}

async function seedPlayer(clubId: string): Promise<Player> {
  const repo = dataSource.getRepository(Player);
  return repo.save(repo.create({ id: randomUUID(), firstNameFr: "Sami", lastNameFr: "Trabelsi", number: 10, teamId: clubId }));
}

describe("MedicalEligibilityService", () => {
  it("submits a PENDING dossier scoped to the club's affiliation", async () => {
    const { submitMedicalEligibilityForClub, listMedicalEligibilitiesForClub } = await import("./MedicalEligibilityService");
    await seedClub("club-1");
    const player = await seedPlayer("club-1");
    const eligibility = await submitMedicalEligibilityForClub("club-1", { playerId: player.id, seasonId: "season-1", examinationDate: "2026-08-01" }, { userId: "u1", role: "CLUB_ADMIN" });
    expect(eligibility.status).toBe("PENDING");
    const items = await listMedicalEligibilitiesForClub("club-1");
    expect(items).toHaveLength(1);
  });

  it("refuses a second submission while one is already pending for the same player and season", async () => {
    const { submitMedicalEligibilityForClub } = await import("./MedicalEligibilityService");
    await seedClub("club-2");
    const player = await seedPlayer("club-2");
    await submitMedicalEligibilityForClub("club-2", { playerId: player.id, seasonId: "season-1", examinationDate: "2026-08-01" }, { userId: "u1", role: "CLUB_ADMIN" });
    await expect(submitMedicalEligibilityForClub("club-2", { playerId: player.id, seasonId: "season-1", examinationDate: "2026-08-02" }, { userId: "u1", role: "CLUB_ADMIN" })).rejects.toThrow(/déjà en cours/i);
  });

  it("refuses a player outside the club", async () => {
    const { submitMedicalEligibilityForClub } = await import("./MedicalEligibilityService");
    await seedClub("club-3"); await seedClub("club-4");
    const player = await seedPlayer("club-3");
    await expect(submitMedicalEligibilityForClub("club-4", { playerId: player.id, seasonId: "season-1", examinationDate: "2026-08-01" }, { userId: "u1", role: "CLUB_ADMIN" })).rejects.toThrow(/introuvable/i);
  });
});
