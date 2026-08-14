import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedBaseGraph } from "@/test/fixtures";
import { Match } from "@/entities/Match";
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

/**
 * TS-02 : mirrorMatchStatus doit alimenter matches.actual_started_at /
 * actual_finished_at, seul endroit de la plateforme qui sait avec certitude
 * quand un match démarre/finit réellement (voir avancement.md).
 */
describe("SheetService.mirrorMatchStatus — actual_started_at / actual_finished_at", () => {
  it("fixe actual_started_at au premier passage IN_PROGRESS", async () => {
    const { SheetService } = await import("./SheetService");
    const { match, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Match).update(match.id, { status: "UPCOMING", actualStartedAt: null });
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "DRAFT" });

    const service = new SheetService();
    await service.updateStatus(sheet.id, "IN_PROGRESS");

    const updated = await dataSource.getRepository(Match).findOne({ where: { id: match.id } });
    expect(updated?.status).toBe("IN_PROGRESS");
    expect(updated?.actualStartedAt).toBeTruthy();
  });

  it("ne réécrit pas actual_started_at si déjà fixé", async () => {
    const { SheetService } = await import("./SheetService");
    const { match, sheet } = await seedBaseGraph(dataSource);
    const originalStart = new Date("2026-01-01T10:00:00Z");
    await dataSource.getRepository(Match).update(match.id, { status: "IN_PROGRESS", actualStartedAt: originalStart });
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "DRAFT" });

    const service = new SheetService();
    await service.updateStatus(sheet.id, "IN_PROGRESS");

    const updated = await dataSource.getRepository(Match).findOne({ where: { id: match.id } });
    expect(updated?.actualStartedAt?.getTime()).toBe(originalStart.getTime());
  });

  it("fixe actual_finished_at quand la feuille passe CLOSED", async () => {
    const { SheetService } = await import("./SheetService");
    const { match, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Match).update(match.id, { status: "IN_PROGRESS" });
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "POST_MATCH_SIGNED" });

    const service = new SheetService();
    await service.updateStatus(sheet.id, "CLOSED");

    const updated = await dataSource.getRepository(Match).findOne({ where: { id: match.id } });
    expect(updated?.status).toBe("FINISHED");
    expect(updated?.actualFinishedAt).toBeTruthy();
  });

  it("ne touche jamais un match CANCELLED", async () => {
    const { SheetService } = await import("./SheetService");
    const { match, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Match).update(match.id, { status: "CANCELLED", actualStartedAt: null });
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "DRAFT" });

    const service = new SheetService();
    await service.updateStatus(sheet.id, "IN_PROGRESS");

    const updated = await dataSource.getRepository(Match).findOne({ where: { id: match.id } });
    expect(updated?.status).toBe("CANCELLED");
    expect(updated?.actualStartedAt).toBeFalsy();
  });
});

/**
 * TS-31 : reopen() remplace l'écriture directe que federation-hub faisait dans
 * ms_sheets/matches (voir /api/internal/matches/[matchId]/reopen).
 */
describe("SheetService.reopen", () => {
  it("rouvre une feuille CLOSED : sheet -> IN_PROGRESS, closedAt effacé, match -> IN_PROGRESS, actualFinishedAt effacé", async () => {
    const { SheetService } = await import("./SheetService");
    const { match, sheet } = await seedBaseGraph(dataSource);
    const startedAt = new Date("2026-01-01T10:00:00Z");
    await dataSource.getRepository(Match).update(match.id, {
      status: "FINISHED",
      actualStartedAt: startedAt,
      actualFinishedAt: new Date("2026-01-01T12:00:00Z"),
    });
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "CLOSED", closedAt: new Date() });

    const service = new SheetService();
    const result = await service.reopen(match.id);

    expect(result.status).toBe("IN_PROGRESS");
    expect(result.closedAt).toBeFalsy();

    const updatedMatch = await dataSource.getRepository(Match).findOne({ where: { id: match.id } });
    expect(updatedMatch?.status).toBe("IN_PROGRESS");
    expect(updatedMatch?.actualFinishedAt).toBeFalsy();
    // L'heure de tout premier démarrage réel ne doit jamais être effacée.
    expect(updatedMatch?.actualStartedAt?.getTime()).toBe(startedAt.getTime());
  });

  it("refuse de rouvrir une feuille qui n'est pas CLOSED", async () => {
    const { SheetService } = await import("./SheetService");
    const { match, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "IN_PROGRESS" });

    const service = new SheetService();
    await expect(service.reopen(match.id)).rejects.toThrow(/Impossible de rouvrir/);
  });

  it("lève une erreur pour un match sans feuille", async () => {
    const { SheetService } = await import("./SheetService");
    const service = new SheetService();
    await expect(service.reopen("00000000-0000-0000-0000-000000000000")).rejects.toThrow(/introuvable/);
  });

  it("ne touche jamais un match CANCELLED", async () => {
    const { SheetService } = await import("./SheetService");
    const { match, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Match).update(match.id, { status: "CANCELLED" });
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "CLOSED", closedAt: new Date() });

    const service = new SheetService();
    await service.reopen(match.id);

    const updatedMatch = await dataSource.getRepository(Match).findOne({ where: { id: match.id } });
    expect(updatedMatch?.status).toBe("CANCELLED");
  });
});

/**
 * TASK-P0-023 : verrou optimiste — deux officiels transitionnant la même
 * feuille en même temps ne doivent plus s'écraser silencieusement.
 */
describe("SheetService — verrou optimiste (version)", () => {
  it("updateStatus incrémente version à chaque appel réussi", async () => {
    const { SheetService } = await import("./SheetService");
    const { sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "DRAFT", version: 1 });

    const service = new SheetService();
    const result = await service.updateStatus(sheet.id, "PRE_MATCH_SIGNED");

    expect(result.version).toBe(2);
  });

  it("updateStatus réussit quand expectedVersion correspond à la version en base", async () => {
    const { SheetService } = await import("./SheetService");
    const { sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "DRAFT", version: 5 });

    const service = new SheetService();
    const result = await service.updateStatus(sheet.id, "PRE_MATCH_SIGNED", 5);

    expect(result.status).toBe("PRE_MATCH_SIGNED");
    expect(result.version).toBe(6);
  });

  it("updateStatus rejette (SheetVersionConflictError) quand expectedVersion est périmée, sans modifier la feuille", async () => {
    const { SheetService, SheetVersionConflictError } = await import("./SheetService");
    const { sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "DRAFT", version: 5 });

    const service = new SheetService();
    await expect(service.updateStatus(sheet.id, "PRE_MATCH_SIGNED", 3)).rejects.toThrow(SheetVersionConflictError);

    const reloaded = await dataSource.getRepository(Sheet).findOneOrFail({ where: { id: sheet.id } });
    expect(reloaded.status).toBe("DRAFT");
    expect(reloaded.version).toBe(5);
  });

  it("simule deux officiels concurrents : le premier gagne, le second (version périmée) est rejeté", async () => {
    const { SheetService, SheetVersionConflictError } = await import("./SheetService");
    const { sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "DRAFT", version: 1 });

    const service = new SheetService();
    // Les deux officiels ont chargé la feuille à version=1 avant que l'un des deux n'écrive.
    await service.updateStatus(sheet.id, "PRE_MATCH_SIGNED", 1);

    await expect(service.updateStatus(sheet.id, "PRE_MATCH_SIGNED", 1)).rejects.toThrow(SheetVersionConflictError);
  });

  it("retry avec la nouvelle version après un conflit réussit", async () => {
    const { SheetService, SheetVersionConflictError } = await import("./SheetService");
    const { sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "DRAFT", version: 1 });

    const service = new SheetService();
    const winner = await service.updateStatus(sheet.id, "PRE_MATCH_SIGNED", 1);
    await expect(service.updateStatus(sheet.id, "PRE_MATCH_SIGNED", 1)).rejects.toThrow(SheetVersionConflictError);

    const retried = await service.updateStatus(sheet.id, "PRE_MATCH_SIGNED", winner.version);
    expect(retried.version).toBe(winner.version + 1);
  });

  it("reopen rejette (SheetVersionConflictError) quand expectedVersion est périmée", async () => {
    const { SheetService, SheetVersionConflictError } = await import("./SheetService");
    const { match, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "CLOSED", closedAt: new Date(), version: 4 });

    const service = new SheetService();
    await expect(service.reopen(match.id, { expectedVersion: 2 })).rejects.toThrow(SheetVersionConflictError);

    const reloaded = await dataSource.getRepository(Sheet).findOneOrFail({ where: { id: sheet.id } });
    expect(reloaded.status).toBe("CLOSED");
  });

  it("reopen réussit et incrémente version quand expectedVersion correspond", async () => {
    const { SheetService } = await import("./SheetService");
    const { match, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "CLOSED", closedAt: new Date(), version: 4 });

    const service = new SheetService();
    const result = await service.reopen(match.id, { expectedVersion: 4 });

    expect(result.status).toBe("IN_PROGRESS");
    expect(result.version).toBe(5);
  });
});

/**
 * TASK-P0-014 : réouverture idempotente — un appelant qui rejoue la même
 * requête (retry réseau après timeout) ne doit jamais échouer ni re-déclencher
 * les effets de bord d'une réouverture déjà traitée.
 */
describe("SheetService.reopen — idempotencyKey", () => {
  it("une clé rejouée renvoie l'état déjà obtenu sans re-vérifier CLOSED", async () => {
    const { SheetService } = await import("./SheetService");
    const { match, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "CLOSED", closedAt: new Date() });

    const service = new SheetService();
    const first = await service.reopen(match.id, { idempotencyKey: "retry-1" });
    expect(first.status).toBe("IN_PROGRESS");

    // La feuille n'est plus CLOSED — un appel normal échouerait ici — mais
    // le rejeu avec la MÊME clé doit réussir et renvoyer le même résultat.
    const replay = await service.reopen(match.id, { idempotencyKey: "retry-1" });
    expect(replay.status).toBe("IN_PROGRESS");
    expect(replay.id).toBe(first.id);
  });

  it("ne mirror pas une seconde fois matches.status sur un rejeu", async () => {
    const { SheetService } = await import("./SheetService");
    const { match, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Match).update(match.id, { status: "FINISHED", actualFinishedAt: new Date() });
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "CLOSED", closedAt: new Date() });

    const service = new SheetService();
    await service.reopen(match.id, { idempotencyKey: "retry-2" });
    await dataSource.getRepository(Match).update(match.id, { actualFinishedAt: new Date("2026-01-01T00:00:00Z") });

    // Si le rejeu ré-exécutait le mirroring, actualFinishedAt serait effacé (null) à nouveau.
    await service.reopen(match.id, { idempotencyKey: "retry-2" });

    const reloadedMatch = await dataSource.getRepository(Match).findOneOrFail({ where: { id: match.id } });
    expect(reloadedMatch.actualFinishedAt).not.toBeNull();
  });

  it("une clé différente sur une feuille déjà réouverte échoue normalement (pas un rejeu)", async () => {
    const { SheetService } = await import("./SheetService");
    const { match, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "CLOSED", closedAt: new Date() });

    const service = new SheetService();
    await service.reopen(match.id, { idempotencyKey: "retry-3" });

    await expect(service.reopen(match.id, { idempotencyKey: "another-key" })).rejects.toThrow(
      /Impossible de rouvrir/,
    );
  });

  it("sans idempotencyKey, le comportement historique est inchangé (rejeu échoue)", async () => {
    const { SheetService } = await import("./SheetService");
    const { match, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "CLOSED", closedAt: new Date() });

    const service = new SheetService();
    await service.reopen(match.id);

    await expect(service.reopen(match.id)).rejects.toThrow(/Impossible de rouvrir/);
  });
});
