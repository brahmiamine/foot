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

/**
 * TASK-P0-025 (portion scopée) : clientRequestId protège contre les
 * doublons (double-clic, retry réseau) sur les événements saisis en
 * direct — voir Goal/Substitution/Injury.clientRequestId et
 * migration_add_event_client_request_id.sql.
 */
describe("Idempotence par clientRequestId sur la saisie live", () => {
  it("GoalService.create() rejoué avec le même clientRequestId renvoie le but déjà créé, pas un doublon", async () => {
    const { GoalService } = await import("./GoalService");
    const { match, homeTeam, player, sheet } = await seedBaseGraph(dataSource);
    const service = new GoalService();
    const clientRequestId = "11111111-1111-1111-1111-111111111111";

    const first = await service.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 12, period: "H1", clientRequestId });
    const second = await service.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 12, period: "H1", clientRequestId });

    expect(second.id).toBe(first.id);
    const { Goal } = await import("@/entities/Goal");
    const all = await dataSource.getRepository(Goal).find({ where: { sheetId: sheet.id } });
    expect(all).toHaveLength(1);
  });

  it("GoalService.create() sans clientRequestId reste non-idempotent (deux buts distincts)", async () => {
    const { GoalService } = await import("./GoalService");
    const { match, homeTeam, player, sheet } = await seedBaseGraph(dataSource);
    const service = new GoalService();

    const first = await service.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 12, period: "H1" });
    const second = await service.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 12, period: "H1" });

    expect(second.id).not.toBe(first.id);
    const { Goal } = await import("@/entities/Goal");
    const all = await dataSource.getRepository(Goal).find({ where: { sheetId: sheet.id } });
    expect(all).toHaveLength(2);
  });

  it("InjuryService.create() rejoué avec le même clientRequestId renvoie la blessure déjà créée, pas un doublon", async () => {
    const { InjuryService } = await import("./InjuryService");
    const { match, homeTeam, player, sheet } = await seedBaseGraph(dataSource);
    const service = new InjuryService();
    const clientRequestId = "22222222-2222-2222-2222-222222222222";
    const input = { sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 30, period: "H1" as const, description: "Entorse", requiresSubstitution: true, clientRequestId };

    const first = await service.create(input);
    const second = await service.create(input);

    expect(second.id).toBe(first.id);
    const { Injury } = await import("@/entities/Injury");
    const all = await dataSource.getRepository(Injury).find({ where: { sheetId: sheet.id } });
    expect(all).toHaveLength(1);
  });

  it("SubstitutionService.create() rejoué avec le même clientRequestId renvoie le remplacement déjà créé, pas un doublon", async () => {
    const { SubstitutionService } = await import("./SubstitutionService");
    const { match, homeTeam, player, sheet } = await seedBaseGraph(dataSource);
    const playerRepo = dataSource.getRepository(Player);
    const incoming = await playerRepo.save(
      playerRepo.create({ id: "p-in-2", firstNameFr: "Sami", lastNameFr: "Jebali", number: 11, teamId: homeTeam.id, status: "SUBSTITUTE", isActive: true }),
    );
    const service = new SubstitutionService();
    const clientRequestId = "33333333-3333-3333-3333-333333333333";
    const input = { sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerOutId: player.id, playerInId: incoming.id, minute: 60, period: "H2" as const, clientRequestId };

    const first = await service.create(input);
    const second = await service.create(input);

    expect(second.id).toBe(first.id);
    const { Substitution } = await import("@/entities/Substitution");
    const all = await dataSource.getRepository(Substitution).find({ where: { sheetId: sheet.id } });
    expect(all).toHaveLength(1);
  });

  it("deux clientRequestId différents créent deux événements distincts pour la même feuille", async () => {
    const { GoalService } = await import("./GoalService");
    const { match, homeTeam, player, sheet } = await seedBaseGraph(dataSource);
    const service = new GoalService();

    const first = await service.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 12, period: "H1", clientRequestId: "aaaa1111-aaaa-1111-aaaa-111111111111" });
    const second = await service.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 45, period: "H1", clientRequestId: "bbbb2222-bbbb-2222-bbbb-222222222222" });

    expect(second.id).not.toBe(first.id);
  });
});
