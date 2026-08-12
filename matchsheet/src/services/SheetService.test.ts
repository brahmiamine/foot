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
