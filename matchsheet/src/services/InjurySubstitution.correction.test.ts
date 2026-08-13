import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedBaseGraph } from "@/test/fixtures";
import { Player } from "@/entities/Player";
import { randomUUID } from "node:crypto";

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

describe("InjuryService.cancel/correct — audit sans suppression (TASK-P0-009)", () => {
  it("annule une blessure sans la supprimer et journalise le motif", async () => {
    const { InjuryService } = await import("./InjuryService");
    const { EventCorrectionService } = await import("./EventCorrectionService");
    const { match, sheet, homeTeam, player } = await seedBaseGraph(dataSource);

    const injuryService = new InjuryService();
    const injury = await injuryService.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 30 });

    await injuryService.cancel(injury.id, { reason: "Saisie en double", ...actor });

    expect(await injuryService.findBySheet(sheet.id)).toHaveLength(0);
    expect(await injuryService.findBySheet(sheet.id, { includeCancelled: true })).toHaveLength(1);

    const corrections = await new EventCorrectionService().findByMatch(match.id);
    expect(corrections).toHaveLength(1);
    expect(corrections[0].eventType).toBe("INJURY");
    expect(corrections[0].action).toBe("CANCELLED");
  });

  it("corrige la description d'une blessure avec avant/après", async () => {
    const { InjuryService } = await import("./InjuryService");
    const { match, sheet, homeTeam, player } = await seedBaseGraph(dataSource);
    const injuryService = new InjuryService();
    const injury = await injuryService.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, description: "Genou" });

    const corrected = await injuryService.correct(injury.id, { description: "Cheville" }, { reason: "Erreur de diagnostic initial", ...actor });
    expect(corrected.description).toBe("Cheville");
  });
});

describe("SubstitutionService.cancel/correct — audit sans suppression (TASK-P0-009)", () => {
  it("annule un remplacement sans le supprimer", async () => {
    const { SubstitutionService } = await import("./SubstitutionService");
    const { match, sheet, homeTeam, player } = await seedBaseGraph(dataSource);
    const playerRepo = dataSource.getRepository(Player);
    const playerIn = await playerRepo.save(
      playerRepo.create({ id: randomUUID(), firstNameFr: "Autre", lastNameFr: "Joueur", number: 11, teamId: homeTeam.id, status: "SUBSTITUTE", isActive: true }),
    );

    const substitutionService = new SubstitutionService();
    const substitution = await substitutionService.create({
      sheetId: sheet.id,
      matchId: match.id,
      teamId: homeTeam.id,
      playerOutId: player.id,
      playerInId: playerIn.id,
      minute: 60,
      period: "H2",
    });

    await substitutionService.cancel(substitution.id, { reason: "Remplacement annulé, joueur finalement apte", ...actor });

    expect(await substitutionService.findBySheet(sheet.id)).toHaveLength(0);
    expect(await substitutionService.findBySheet(sheet.id, { includeCancelled: true })).toHaveLength(1);
  });

  it("refuse une correction sans motif", async () => {
    const { SubstitutionService } = await import("./SubstitutionService");
    const { match, sheet, homeTeam, player } = await seedBaseGraph(dataSource);
    const playerRepo = dataSource.getRepository(Player);
    const playerIn = await playerRepo.save(
      playerRepo.create({ id: randomUUID(), firstNameFr: "Autre", lastNameFr: "Joueur", number: 11, teamId: homeTeam.id, status: "SUBSTITUTE", isActive: true }),
    );
    const substitutionService = new SubstitutionService();
    const substitution = await substitutionService.create({
      sheetId: sheet.id,
      matchId: match.id,
      teamId: homeTeam.id,
      playerOutId: player.id,
      playerInId: playerIn.id,
      minute: 60,
      period: "H2",
    });

    await expect(substitutionService.correct(substitution.id, { minute: 65 }, { reason: "", ...actor })).rejects.toThrow(/motif/);
  });
});
