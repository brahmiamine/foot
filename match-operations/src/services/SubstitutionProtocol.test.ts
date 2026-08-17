import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { Match } from "@/entities/Match";
import { Matchday } from "@/entities/Matchday";
import { Player } from "@/entities/Player";
import { Sheet } from "@/entities/Sheet";
import { Substitution } from "@/entities/Substitution";
import { Team } from "@/entities/Team";

let dataSource: DataSource;

vi.mock("@/lib/db", () => ({
  getDataSource: async () => dataSource,
}));

const homeId = "10000000-0000-0000-0000-000000000001";
const awayId = "10000000-0000-0000-0000-000000000002";
const matchdayId = "10000000-0000-0000-0000-000000000003";
const seasonId = "10000000-0000-0000-0000-000000000004";
const matchId = "10000000-0000-0000-0000-000000000005";
const firstRequestId = "10000000-0000-0000-0000-000000000006";
const secondRequestId = "10000000-0000-0000-0000-000000000007";

async function seedLiveMatch() {
  const teamRepo = dataSource.getRepository(Team);
  await teamRepo.save([
    teamRepo.create({ id: homeId, nom: "Home", teamType: "club", sport: "football", ageCategory: "seniors", gender: "male" }),
    teamRepo.create({ id: awayId, nom: "Away", teamType: "club", sport: "football", ageCategory: "seniors", gender: "male" }),
  ]);
  await dataSource.getRepository(Matchday).save(
    dataSource.getRepository(Matchday).create({ id: matchdayId, seasonId, number: 1 }),
  );
  await dataSource.getRepository(Match).save(
    dataSource.getRepository(Match).create({
      id: matchId,
      journeeId: matchdayId,
      equipeHome: homeId,
      equipeAway: awayId,
      status: "IN_PROGRESS",
      illegalPlayerUsed: false,
      isPublicVisible: true,
    }),
  );
  const sheet = await dataSource.getRepository(Sheet).save(
    dataSource.getRepository(Sheet).create({ matchId, status: "IN_PROGRESS", version: 1 }),
  );

  const playerRepo = dataSource.getRepository(Player);
  await playerRepo.save([
    playerRepo.create({ id: "sub-p1", firstNameFr: "A", lastNameFr: "One", number: 1, teamId: homeId, status: "TITULAR", isActive: true }),
    playerRepo.create({ id: "sub-p2", firstNameFr: "B", lastNameFr: "Two", number: 2, teamId: homeId, status: "SUBSTITUTE", isActive: true }),
    playerRepo.create({ id: "sub-p3", firstNameFr: "C", lastNameFr: "Three", number: 3, teamId: homeId, status: "TITULAR", isActive: true }),
    playerRepo.create({ id: "sub-p4", firstNameFr: "D", lastNameFr: "Four", number: 4, teamId: homeId, status: "SUBSTITUTE", isActive: true }),
  ]);
  return sheet;
}

beforeEach(async () => {
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  await dataSource.destroy();
  vi.restoreAllMocks();
});

describe("SubstitutionService + CompetitionMatchProtocol", () => {
  it("blocks a new substitution at quota while preserving idempotent retry", async () => {
    const sheet = await seedLiveMatch();
    const { CompetitionMatchProtocolService } = await import("./CompetitionMatchProtocolService");
    const { SubstitutionService } = await import("./SubstitutionService");
    await new CompetitionMatchProtocolService().updateForSeason(
      seasonId,
      {
        maxSubstitutions: 1,
        requireHomeSignature: false,
        requireAwaySignature: false,
        requireRefereeSignature: false,
      },
      "federation-admin",
    );

    const service = new SubstitutionService();
    const first = await service.create({
      sheetId: sheet.id,
      matchId,
      teamId: homeId,
      playerOutId: "sub-p1",
      playerInId: "sub-p2",
      minute: 55,
      period: "H2",
      clientRequestId: firstRequestId,
    });

    await expect(
      service.create({
        sheetId: sheet.id,
        matchId,
        teamId: homeId,
        playerOutId: "sub-p3",
        playerInId: "sub-p4",
        minute: 60,
        period: "H2",
        clientRequestId: secondRequestId,
      }),
    ).rejects.toThrow("Nombre maximal de remplacements atteint (1)");

    const replay = await service.create({
      sheetId: sheet.id,
      matchId,
      teamId: homeId,
      playerOutId: "sub-p1",
      playerInId: "sub-p2",
      minute: 55,
      period: "H2",
      clientRequestId: firstRequestId,
    });

    expect(replay.id).toBe(first.id);
    expect(await dataSource.getRepository(Substitution).count()).toBe(1);
  });
});
