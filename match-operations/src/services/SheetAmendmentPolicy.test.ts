import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { Goal } from "@/entities/Goal";
import { Match } from "@/entities/Match";
import { Matchday } from "@/entities/Matchday";
import { Sheet } from "@/entities/Sheet";
import { SheetAmendment } from "@/entities/SheetAmendment";
import { Team } from "@/entities/Team";

let dataSource: DataSource;

vi.mock("@/lib/db", () => ({
  getDataSource: async () => dataSource,
}));

const homeId = "30000000-0000-0000-0000-000000000001";
const awayId = "30000000-0000-0000-0000-000000000002";
const matchdayId = "30000000-0000-0000-0000-000000000003";
const seasonId = "30000000-0000-0000-0000-000000000004";
const matchId = "30000000-0000-0000-0000-000000000005";

async function seedSignedSheet(postMatchSignedAt: Date) {
  const teams = dataSource.getRepository(Team);
  await teams.save([
    teams.create({ id: homeId, nom: "Home", teamType: "club", sport: "football", ageCategory: "seniors", gender: "male" }),
    teams.create({ id: awayId, nom: "Away", teamType: "club", sport: "football", ageCategory: "seniors", gender: "male" }),
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
      postMatchSignedAt,
    }),
  );
  const goal = await dataSource.getRepository(Goal).save(
    dataSource.getRepository(Goal).create({
      sheetId: sheet.id,
      matchId,
      teamId: homeId,
      playerId: null,
      minute: 40,
      period: "H1",
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

describe("post-signature correction policy", () => {
  it("rejects an amendment request after the configured correction window", async () => {
    const now = new Date();
    const { sheet } = await seedSignedSheet(new Date(now.getTime() - 61 * 60_000));
    const { CompetitionMatchProtocolService } = await import("./CompetitionMatchProtocolService");
    const { SheetAmendmentService } = await import("./SheetAmendmentService");
    await new CompetitionMatchProtocolService().updateForSeason(
      seasonId,
      { postSignatureCorrectionWindowMinutes: 60 },
      "federation-admin",
    );

    await expect(
      new SheetAmendmentService().request(
        sheet.id,
        "Correction demandée hors délai",
        { actorUserId: "referee-1", actorName: "Referee" },
        now,
      ),
    ).rejects.toThrow("fenêtre de correction post-signature");
    expect(await dataSource.getRepository(SheetAmendment).count()).toBe(0);
  });

  it("requires federation approval, persists policy version and only unlocks after approval", async () => {
    const now = new Date();
    const { sheet, goal } = await seedSignedSheet(new Date(now.getTime() - 10 * 60_000));
    const { CompetitionMatchProtocolService } = await import("./CompetitionMatchProtocolService");
    const { SheetAmendmentService } = await import("./SheetAmendmentService");
    const { GoalService } = await import("./GoalService");
    const protocolService = new CompetitionMatchProtocolService();
    const amendments = new SheetAmendmentService();
    const goals = new GoalService();

    const protocol = await protocolService.updateForSeason(
      seasonId,
      {
        postSignatureCorrectionWindowMinutes: 60,
        postSignatureFederationApprovalRequired: true,
      },
      "federation-admin",
    );
    expect(protocol.version).toBe(1);

    const first = await amendments.request(
      sheet.id,
      "Corriger la minute du but",
      { actorUserId: "referee-1", actorName: "Referee" },
      now,
    );
    expect(first).toMatchObject({
      status: "AMENDMENT_REQUESTED",
      approvalStatus: "PENDING",
      protocolVersionUsed: 1,
    });

    await expect(
      goals.correct(
        goal.id,
        { minute: 41 },
        { actorUserId: "referee-1", actorName: "Referee", reason: "Minute incorrecte constatée" },
      ),
    ).rejects.toThrow("approuvée par la Fédération");

    const rejected = await amendments.decide(
      sheet.id,
      first.id,
      "REJECT",
      "Justification insuffisante",
      { actorUserId: "fed-1", actorName: "Federation" },
    );
    expect(rejected.approvalStatus).toBe("REJECTED");
    await expect(
      goals.correct(
        goal.id,
        { minute: 41 },
        { actorUserId: "referee-1", actorName: "Referee", reason: "Minute incorrecte constatée" },
      ),
    ).rejects.toThrow("ouvrez un amendement");

    // Une policy modifiée après la première demande ne réécrit jamais la
    // version historique appliquée à cette demande rejetée.
    const changedProtocol = await protocolService.updateForSeason(
      seasonId,
      { postSignatureCorrectionWindowMinutes: 90 },
      "federation-admin-2",
    );
    expect(changedProtocol.version).toBe(2);
    expect((await dataSource.getRepository(SheetAmendment).findOneByOrFail({ id: first.id })).protocolVersionUsed).toBe(1);

    const second = await amendments.request(
      sheet.id,
      "Nouvelle demande correctement justifiée",
      { actorUserId: "referee-1", actorName: "Referee" },
      now,
    );
    expect(second).toMatchObject({ approvalStatus: "PENDING", protocolVersionUsed: 2 });

    const approved = await amendments.decide(
      sheet.id,
      second.id,
      "APPROVE",
      "Validation fédérale",
      { actorUserId: "fed-2", actorName: "Federation" },
    );
    expect(approved.approvalStatus).toBe("APPROVED");

    const corrected = await goals.correct(
      goal.id,
      { minute: 41 },
      { actorUserId: "referee-1", actorName: "Referee", reason: "Minute incorrecte constatée" },
    );
    expect(corrected.minute).toBe(41);
    expect((await dataSource.getRepository(SheetAmendment).findOneByOrFail({ id: second.id })).status).toBe("AMENDED");
  });
});
