import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { CompetitionMatchProtocol } from "@/entities/CompetitionMatchProtocol";
import { Match } from "@/entities/Match";
import { Matchday } from "@/entities/Matchday";
import { MatchLineup } from "@/entities/MatchLineup";
import { MatchOfficialAssignment } from "@/entities/MatchOfficialAssignment";
import { Player } from "@/entities/Player";
import { Sheet } from "@/entities/Sheet";
import { Signature } from "@/entities/Signature";
import { Team } from "@/entities/Team";

let dataSource: DataSource;

vi.mock("@/lib/db", () => ({
  getDataSource: async () => dataSource,
}));

const homeId = "00000000-0000-0000-0000-000000000001";
const awayId = "00000000-0000-0000-0000-000000000002";
const matchdayId = "00000000-0000-0000-0000-000000000003";
const seasonId = "00000000-0000-0000-0000-000000000004";
const matchId = "00000000-0000-0000-0000-000000000005";

async function seedBase() {
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
      date: new Date(Date.now() + 2 * 60 * 60_000),
      status: "UPCOMING",
      illegalPlayerUsed: false,
      isPublicVisible: true,
    }),
  );
  return dataSource.getRepository(Sheet).save(
    dataSource.getRepository(Sheet).create({ matchId, status: "DRAFT", version: 1 }),
  );
}

async function addSignature(sheetId: number, actorRole: "TEAM_HOME" | "TEAM_AWAY" | "REFEREE") {
  const repo = dataSource.getRepository(Signature);
  await repo.save(
    repo.create({
      sheetId,
      phase: "PRE_MATCH",
      actorRole,
      signatureData: "data:image/png;base64,x",
      contentHash: "hash",
    }),
  );
}

beforeEach(async () => {
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  await dataSource.destroy();
  vi.restoreAllMocks();
});

describe("CompetitionMatchProtocolService", () => {
  it("preserves legacy defaults when no season protocol exists", async () => {
    const sheet = await seedBase();
    const { CompetitionMatchProtocolService } = await import("./CompetitionMatchProtocolService");
    const service = new CompetitionMatchProtocolService();

    const protocol = await service.getForMatch(matchId);
    expect(protocol).toMatchObject({
      seasonId,
      version: 0,
      maxBenchPlayers: null,
      maxSubstitutions: null,
      requireHomeSignature: true,
      requireAwaySignature: true,
      requireRefereeSignature: true,
      requireCenterReferee: false,
    });

    await expect(service.validatePreMatch(sheet.id, matchId)).rejects.toThrow("Signatures pré-match manquantes");
    await addSignature(sheet.id, "TEAM_HOME");
    await addSignature(sheet.id, "TEAM_AWAY");
    await addSignature(sheet.id, "REFEREE");
    await expect(service.validatePreMatch(sheet.id, matchId)).resolves.toBeUndefined();
  });

  it("enforces configured bench size, signatures and required officials", async () => {
    const sheet = await seedBase();
    const { CompetitionMatchProtocolService } = await import("./CompetitionMatchProtocolService");
    const service = new CompetitionMatchProtocolService();
    await service.updateForSeason(
      seasonId,
      {
        maxBenchPlayers: 1,
        requireHomeSignature: false,
        requireAwaySignature: false,
        requireRefereeSignature: true,
        requireCenterReferee: true,
        requiredAssistantReferees: 2,
      },
      "federation-admin",
    );

    const playerRepo = dataSource.getRepository(Player);
    const players = await playerRepo.save([
      playerRepo.create({ id: "p1", firstNameFr: "A", lastNameFr: "A", number: 12, teamId: homeId, status: "SUBSTITUTE", isActive: true }),
      playerRepo.create({ id: "p2", firstNameFr: "B", lastNameFr: "B", number: 13, teamId: homeId, status: "SUBSTITUTE", isActive: true }),
    ]);
    const lineupRepo = dataSource.getRepository(MatchLineup);
    await lineupRepo.save(
      players.map((player) =>
        lineupRepo.create({ teamId: homeId, matchId, playerId: player.id, role: "SUBSTITUTE", isCaptain: false }),
      ),
    );
    await addSignature(sheet.id, "REFEREE");

    await expect(service.validatePreMatch(sheet.id, matchId)).rejects.toThrow("dépasse la limite autorisée");

    await dataSource.getRepository(CompetitionMatchProtocol).update({ seasonId }, { maxBenchPlayers: 2 });
    const assignmentRepo = dataSource.getRepository(MatchOfficialAssignment);
    await assignmentRepo.save(
      assignmentRepo.create({
        matchId,
        userId: "ref-center",
        role: "CENTER_REFEREE",
        status: "ACTIVE",
        assignedBy: "federation-admin",
      }),
    );
    await expect(service.validatePreMatch(sheet.id, matchId)).rejects.toThrow("ASSISTANT_REFEREE (0/2)");

    await assignmentRepo.save([
      assignmentRepo.create({ matchId, userId: "assistant-1", role: "ASSISTANT_REFEREE", status: "ACTIVE" }),
      assignmentRepo.create({ matchId, userId: "assistant-2", role: "ASSISTANT_REFEREE", status: "ACTIVE" }),
    ]);
    await expect(service.validatePreMatch(sheet.id, matchId)).resolves.toBeUndefined();
  });

  it("enforces an explicitly configured pre-match deadline", async () => {
    const sheet = await seedBase();
    const { CompetitionMatchProtocolService } = await import("./CompetitionMatchProtocolService");
    const service = new CompetitionMatchProtocolService();
    await service.updateForSeason(
      seasonId,
      {
        preMatchSigningDeadlineMinutes: 60,
        requireHomeSignature: false,
        requireAwaySignature: false,
        requireRefereeSignature: false,
      },
      "federation-admin",
    );
    const match = await dataSource.getRepository(Match).findOneByOrFail({ id: matchId });

    const afterCutoff = new Date(match.date!.getTime() - 30 * 60_000);
    await expect(service.validatePreMatch(sheet.id, matchId, afterCutoff)).rejects.toThrow("deadline pré-match");
  });
});
