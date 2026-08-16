import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedBaseGraph } from "@/test/fixtures";
import { Sheet } from "@/entities/Sheet";

let dataSource: DataSource;

vi.mock("@/lib/db", () => ({
  getDataSource: async () => dataSource,
}));

vi.mock("@/lib/matchActorSession", () => ({
  assertCurrentMatchAccess: async () => ({
    userId: "test-official",
    role: "REFEREE",
    teamId: null,
  }),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: () => null }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  await dataSource.destroy();
});

/**
 * TASK-P0-010 : deux officiels autorisés chargent le même écran (même version
 * connue), l'un des deux clique en premier — le second doit être rejeté avec
 * un conflit explicite (pas un écrasement silencieux), et invité à recharger.
 */
describe("startMatch — verrou optimiste bout en bout (TASK-P0-010)", () => {
  it("un succès puis un conflit pour deux officiels partant de la même version", async () => {
    const { startMatch } = await import("./actions");
    const { match, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "PRE_MATCH_SIGNED", version: 1 });

    // Les deux officiels ont chargé l'écran avec version=1.
    const first = await startMatch(sheet.id, match.id, 1);
    expect(first).toEqual({ success: true, message: "actions.events.start.saved" });

    const second = await startMatch(sheet.id, match.id, 1);
    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toBe("actions.sheet.errors.conflict");
      expect(second.conflict).toBe(true);
    }

    // La feuille reflète l'écriture du premier officiel, pas écrasée par le second.
    const reloaded = await dataSource.getRepository(Sheet).findOneOrFail({ where: { id: sheet.id } });
    expect(reloaded.status).toBe("IN_PROGRESS");
    expect(reloaded.version).toBe(2);
  });

  it("un réessai après rechargement (nouvelle version) réussit", async () => {
    const { startMatch } = await import("./actions");
    const { match, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "PRE_MATCH_SIGNED", version: 1 });

    await startMatch(sheet.id, match.id, 1);
    const conflicted = await startMatch(sheet.id, match.id, 1);
    expect(conflicted.success).toBe(false);

    // L'officiel recharge (version=2 désormais) puis réessaie.
    const retried = await startMatch(sheet.id, match.id, 2);
    expect(retried).toEqual({ success: true, message: "actions.events.start.saved" });
  });
});
