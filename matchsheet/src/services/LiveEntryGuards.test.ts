import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedBaseGraph } from "@/test/fixtures";
import { Sheet } from "@/entities/Sheet";
import { Player } from "@/entities/Player";

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

/**
 * Vérifie que GoalService/InjuryService/SubstitutionService refusent toute
 * écriture une fois la feuille CLOSED, comme CardEventService (voir
 * CardEventService.test.ts et services/sheetGuard.ts) — jusqu'ici seul
 * post-match/actions.ts appliquait ce garde-fou, les services de saisie
 * live n'en avaient aucun (voir avancement.md).
 */
describe("Garde-fou de statut de feuille sur la saisie live", () => {
  it("GoalService.create() fonctionne tant que la feuille est IN_PROGRESS, refuse quand CLOSED", async () => {
    const { GoalService } = await import("./GoalService");
    const { SheetClosedError } = await import("./sheetGuard");
    const { match, homeTeam, player, sheet } = await seedBaseGraph(dataSource);
    const service = new GoalService();

    const goal = await service.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 12, period: "H1" });
    expect(goal.id).toBeTruthy();

    await dataSource.getRepository(Sheet).update(sheet.id, { status: "CLOSED" });
    await expect(
      service.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 13, period: "H1" }),
    ).rejects.toThrow(SheetClosedError);
  });

  it("InjuryService.create() fonctionne tant que la feuille est IN_PROGRESS, refuse quand CLOSED", async () => {
    const { InjuryService } = await import("./InjuryService");
    const { SheetClosedError } = await import("./sheetGuard");
    const { match, homeTeam, player, sheet } = await seedBaseGraph(dataSource);
    const service = new InjuryService();

    const injury = await service.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 30, period: "H1", description: "Entorse", requiresSubstitution: true });
    expect(injury.id).toBeTruthy();

    await dataSource.getRepository(Sheet).update(sheet.id, { status: "CLOSED" });
    await expect(
      service.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 31, period: "H1", description: "Autre", requiresSubstitution: false }),
    ).rejects.toThrow(SheetClosedError);
  });

  it("SubstitutionService.create() fonctionne tant que la feuille est IN_PROGRESS, refuse quand CLOSED", async () => {
    const { SubstitutionService } = await import("./SubstitutionService");
    const { SheetClosedError } = await import("./sheetGuard");
    const { match, homeTeam, player, sheet } = await seedBaseGraph(dataSource);
    const playerRepo = dataSource.getRepository(Player);
    const incoming = await playerRepo.save(
      playerRepo.create({ id: "p-in", firstNameFr: "Sami", lastNameFr: "Jebali", number: 11, teamId: homeTeam.id, status: "SUBSTITUTE", isActive: true }),
    );
    const service = new SubstitutionService();

    const sub = await service.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerOutId: player.id, playerInId: incoming.id, minute: 60, period: "H2" });
    expect(sub.id).toBeTruthy();

    await dataSource.getRepository(Sheet).update(sheet.id, { status: "CLOSED" });
    await expect(
      service.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerOutId: player.id, playerInId: incoming.id, minute: 61, period: "H2" }),
    ).rejects.toThrow(SheetClosedError);
  });
});
