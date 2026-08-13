import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedBaseGraph } from "@/test/fixtures";
import { Sheet } from "@/entities/Sheet";

let dataSource: DataSource;

vi.mock("@/lib/db", () => ({
  getDataSource: async () => dataSource,
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  await dataSource.destroy();
});

const actor = { actorUserId: "user-1", actorName: "Opérateur Club" };

describe("GoalService.cancel — annulation sans suppression (TASK-P0-009)", () => {
  it("annule un but : la ligne reste en base mais disparaît du décompte par défaut", async () => {
    const { GoalService } = await import("./GoalService");
    const { EventCorrectionService } = await import("./EventCorrectionService");
    const { match, sheet, homeTeam, player } = await seedBaseGraph(dataSource);

    const goalService = new GoalService();
    const goal = await goalService.create({
      sheetId: sheet.id,
      matchId: match.id,
      teamId: homeTeam.id,
      playerId: player.id,
      minute: 12,
      period: "H1",
    });

    await goalService.cancel(goal.id, { reason: "But refusé après visionnage vidéo", ...actor });

    const visible = await goalService.findBySheet(sheet.id);
    expect(visible).toHaveLength(0);

    const withCancelled = await goalService.findBySheet(sheet.id, { includeCancelled: true });
    expect(withCancelled).toHaveLength(1);
    expect(withCancelled[0].cancelledAt).not.toBeNull();
    expect(withCancelled[0].cancelledReason).toBe("But refusé après visionnage vidéo");

    const corrections = await new EventCorrectionService().findByMatch(match.id);
    expect(corrections).toHaveLength(1);
    expect(corrections[0].action).toBe("CANCELLED");
    expect(corrections[0].eventType).toBe("GOAL");
    expect(corrections[0].reason).toBe("But refusé après visionnage vidéo");
    expect(JSON.parse(corrections[0].beforeValue)).toMatchObject({ minute: 12 });
    expect(corrections[0].afterValue).toBeNull();
  });

  it("refuse d'annuler sans motif (ou motif trop court)", async () => {
    const { GoalService } = await import("./GoalService");
    const { match, sheet, homeTeam, player } = await seedBaseGraph(dataSource);
    const goalService = new GoalService();
    const goal = await goalService.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 12, period: "H1" });

    await expect(goalService.cancel(goal.id, { reason: "", ...actor })).rejects.toThrow(/motif/);
    await expect(goalService.cancel(goal.id, { reason: "ab", ...actor })).rejects.toThrow(/motif/);
  });

  it("refuse d'annuler deux fois le même but", async () => {
    const { GoalService } = await import("./GoalService");
    const { match, sheet, homeTeam, player } = await seedBaseGraph(dataSource);
    const goalService = new GoalService();
    const goal = await goalService.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 12, period: "H1" });

    await goalService.cancel(goal.id, { reason: "Erreur de saisie", ...actor });
    await expect(goalService.cancel(goal.id, { reason: "Nouvelle tentative", ...actor })).rejects.toThrow(/déjà été annulé/);
  });

  it("refuse toute correction/annulation sur une feuille clôturée", async () => {
    const { GoalService } = await import("./GoalService");
    const { match, sheet, homeTeam, player } = await seedBaseGraph(dataSource);
    const goalService = new GoalService();
    const goal = await goalService.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 12, period: "H1" });

    await dataSource.getRepository(Sheet).update(sheet.id, { status: "CLOSED" });

    await expect(goalService.cancel(goal.id, { reason: "Motif suffisant", ...actor })).rejects.toThrow(/clôturée/);
  });
});

describe("GoalService.correct — correction en place avec audit avant/après (TASK-P0-009)", () => {
  it("corrige la minute d'un but et journalise avant/après", async () => {
    const { GoalService } = await import("./GoalService");
    const { EventCorrectionService } = await import("./EventCorrectionService");
    const { match, sheet, homeTeam, player } = await seedBaseGraph(dataSource);
    const goalService = new GoalService();
    const goal = await goalService.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 12, period: "H1" });

    const corrected = await goalService.correct(goal.id, { minute: 15 }, { reason: "Minute mal notée sur le terrain", ...actor });
    expect(corrected.minute).toBe(15);

    const corrections = await new EventCorrectionService().findByMatch(match.id);
    expect(corrections).toHaveLength(1);
    expect(corrections[0].action).toBe("CORRECTED");
    expect(JSON.parse(corrections[0].beforeValue)).toMatchObject({ minute: 12 });
    expect(JSON.parse(corrections[0].afterValue!)).toMatchObject({ minute: 15 });
  });
});

describe("computeLiveScore — recalcul déterministe (TASK-P0-009)", () => {
  it("compte les buts non annulés, un csc marquant pour l'adversaire", async () => {
    const { GoalService } = await import("./GoalService");
    const { computeLiveScore } = await import("./matchScore");
    const { match, sheet, homeTeam, awayTeam, player } = await seedBaseGraph(dataSource);
    const goalService = new GoalService();

    const g1 = await goalService.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 10, period: "H1" });
    await goalService.create({ sheetId: sheet.id, matchId: match.id, teamId: awayTeam.id, playerId: null, minute: 20, period: "H1" });
    // csc de l'équipe domicile : marque pour l'équipe visiteuse.
    await goalService.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 30, period: "H1", isOwnGoal: true });

    expect(await computeLiveScore(match.id, homeTeam.id, awayTeam.id)).toEqual({ home: 1, away: 2 });

    // Annuler le but du but domicile ramène le score à 0-2.
    await goalService.cancel(g1.id, { reason: "But annulé par la commission", ...actor });
    expect(await computeLiveScore(match.id, homeTeam.id, awayTeam.id)).toEqual({ home: 0, away: 2 });
  });
});

describe("SignatureService.isPhaseValid — invalidation après correction (TASK-P0-009)", () => {
  it("une correction après signature invalide la signature (hash devenu obsolète)", async () => {
    const { GoalService } = await import("./GoalService");
    const { SignatureService } = await import("./SignatureService");
    const { match, sheet, homeTeam, player } = await seedBaseGraph(dataSource);

    const goalService = new GoalService();
    const goal = await goalService.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 10, period: "H1" });

    const signatureService = new SignatureService();
    for (const actorRole of ["TEAM_HOME", "TEAM_AWAY", "REFEREE"] as const) {
      await signatureService.save(
        sheet.id,
        match.id,
        "POST_MATCH",
        actorRole,
        { signerName: actorRole, signatureData: "data:image/png;base64,x" },
        { userId: "user-1", name: "Opérateur" },
      );
    }

    expect(await signatureService.isPhaseComplete(sheet.id, "POST_MATCH")).toBe(true);
    expect(await signatureService.isPhaseValid(sheet.id, match.id, "POST_MATCH")).toBe(true);

    await goalService.correct(goal.id, { minute: 11 }, { reason: "Minute corrigée après signature", ...actor });

    // Complet (3 rôles ont signé) mais plus valide : le contenu a changé depuis.
    expect(await signatureService.isPhaseComplete(sheet.id, "POST_MATCH")).toBe(true);
    expect(await signatureService.isPhaseValid(sheet.id, match.id, "POST_MATCH")).toBe(false);

    // Une nouvelle signature de chaque acteur rend la phase de nouveau valide.
    for (const actorRole of ["TEAM_HOME", "TEAM_AWAY", "REFEREE"] as const) {
      await signatureService.save(
        sheet.id,
        match.id,
        "POST_MATCH",
        actorRole,
        { signerName: actorRole, signatureData: "data:image/png;base64,y" },
        { userId: "user-1", name: "Opérateur" },
      );
    }
    expect(await signatureService.isPhaseValid(sheet.id, match.id, "POST_MATCH")).toBe(true);
  });
});
