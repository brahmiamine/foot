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
 * TS-31 : reopen() remplace l'écriture directe que superadmin faisait dans
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
