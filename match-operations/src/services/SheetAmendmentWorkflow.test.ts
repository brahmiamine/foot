import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { Goal } from "@/entities/Goal";
import { Match } from "@/entities/Match";
import { Matchday } from "@/entities/Matchday";
import { MatchEventCorrection } from "@/entities/MatchEventCorrection";
import { Sheet } from "@/entities/Sheet";
import { SheetAmendment } from "@/entities/SheetAmendment";
import { Team } from "@/entities/Team";

let dataSource: DataSource;

vi.mock("@/lib/db", () => ({
  getDataSource: async () => dataSource,
}));

const homeId = "20000000-0000-0000-0000-000000000001";
const awayId = "20000000-0000-0000-0000-000000000002";
const matchdayId = "20000000-0000-0000-0000-000000000003";
const matchId = "20000000-0000-0000-0000-000000000004";

async function seedSignedSheet() {
  const teamRepo = dataSource.getRepository(Team);
  await teamRepo.save([
    teamRepo.create({ id: homeId, nom: "Home", teamType: "club", sport: "football", ageCategory: "seniors", gender: "male" }),
    teamRepo.create({ id: awayId, nom: "Away", teamType: "club", sport: "football", ageCategory: "seniors", gender: "male" }),
  ]);
  await dataSource.getRepository(Matchday).save(
    dataSource.getRepository(Matchday).create({ id: matchdayId, seasonId: null, number: 1 }),
  );
  await dataSource.getRepository(Match).save(
    dataSource.getRepository(Match).create({
      id: matchId,
      journeeId: matchdayId,
      equipeHome: homeId,
      equipeAway: awayId,
      status: "FINISHED",
      illegalPlayerUsed: false,
      isPublicVisible: true,
    }),
  );
  const sheet = await dataSource.getRepository(Sheet).save(
    dataSource.getRepository(Sheet).create({
      matchId,
      status: "POST_MATCH_SIGNED",
      version: 1,
      postMatchSignedAt: new Date(),
    }),
  );
  const goal = await dataSource.getRepository(Goal).save(
    dataSource.getRepository(Goal).create({
      sheetId: sheet.id,
      matchId,
      teamId: homeId,
      playerId: null,
      minute: 50,
      period: "H2",
      isOwnGoal: false,
      isPenalty: false,
      clientRequestId: null,
    }),
  );
  return { sheet, goal };
}

beforeEach(async () => {
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  await dataSource.destroy();
  vi.restoreAllMocks();
});

describe("signed sheet amendment workflow", () => {
  it("requires an amendment, audits the correction, then closes only after valid re-signatures", async () => {
    const { sheet, goal } = await seedSignedSheet();
    const { GoalService } = await import("./GoalService");
    const { SheetAmendmentService } = await import("./SheetAmendmentService");
    const { SignatureService } = await import("./SignatureService");
    const goals = new GoalService();
    const amendments = new SheetAmendmentService();
    const signatures = new SignatureService();
    const actor = { actorUserId: "referee-1", actorName: "Referee", reason: "Correction minute du but" };

    // Signatures historiques du contenu avant correction.
    for (const role of ["TEAM_HOME", "TEAM_AWAY", "REFEREE"] as const) {
      await signatures.save(
        sheet.id,
        matchId,
        "POST_MATCH",
        role,
        { signatureData: `old-${role}` },
        { userId: role, name: role },
      );
    }
    expect(await signatures.isPhaseValid(sheet.id, matchId, "POST_MATCH")).toBe(true);

    await expect(goals.correct(goal.id, { minute: 51 }, actor)).rejects.toThrow("ouvrez un amendement");

    const request = await amendments.request(sheet.id, "Erreur constatée après signature", {
      actorUserId: "federation-admin",
      actorName: "Federation Admin",
    });
    expect(request.status).toBe("AMENDMENT_REQUESTED");

    // Un amendement n'est pas une permission de créer silencieusement un
    // nouvel événement live : seuls correct/cancel passent par le ledger.
    await expect(
      goals.create({
        sheetId: sheet.id,
        matchId,
        teamId: homeId,
        minute: 70,
        period: "H2",
      }),
    ).rejects.toThrow();

    const corrected = await goals.correct(goal.id, { minute: 51 }, actor);
    expect(corrected.minute).toBe(51);
    expect(await dataSource.getRepository(MatchEventCorrection).count()).toBe(1);

    let amendment = await dataSource.getRepository(SheetAmendment).findOneByOrFail({ id: request.id });
    expect(amendment.status).toBe("AMENDED");
    expect(amendment.amendedAt).toBeInstanceOf(Date);
    expect(await signatures.isPhaseValid(sheet.id, matchId, "POST_MATCH")).toBe(false);

    await signatures.save(
      sheet.id,
      matchId,
      "POST_MATCH",
      "TEAM_HOME",
      { signatureData: "new-home" },
      { userId: "home", name: "Home" },
    );
    amendment = await dataSource.getRepository(SheetAmendment).findOneByOrFail({ id: request.id });
    expect(amendment.status).toBe("AMENDED");

    await signatures.save(
      sheet.id,
      matchId,
      "POST_MATCH",
      "TEAM_AWAY",
      { signatureData: "new-away" },
      { userId: "away", name: "Away" },
    );
    await signatures.save(
      sheet.id,
      matchId,
      "POST_MATCH",
      "REFEREE",
      { signatureData: "new-referee" },
      { userId: "referee", name: "Referee" },
    );

    amendment = await dataSource.getRepository(SheetAmendment).findOneByOrFail({ id: request.id });
    expect(amendment.status).toBe("RE_SIGNED");
    expect(amendment.reSignedAt).toBeInstanceOf(Date);
    expect(await signatures.isPhaseValid(sheet.id, matchId, "POST_MATCH")).toBe(true);

    await expect(goals.correct(goal.id, { minute: 52 }, actor)).rejects.toThrow("ouvrez un amendement");
  });
});
