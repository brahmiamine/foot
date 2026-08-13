import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedBaseGraph } from "@/test/fixtures";
import { Goal } from "@/entities/Goal";

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

/** TASK-P0-024 : signatures append-only, avec hash de contenu et traçabilité de l'opérateur. */
describe("SignatureService.save — append-only + contentHash + recordedBy", () => {
  it("enregistre l'identité de l'opérateur et un contentHash", async () => {
    const { SignatureService } = await import("./SignatureService");
    const { match, sheet } = await seedBaseGraph(dataSource);

    const service = new SignatureService();
    const signature = await service.save(
      sheet.id,
      match.id,
      "PRE_MATCH",
      "REFEREE",
      { signerName: "M. Arbitre", signatureData: "data:image/png;base64,abc" },
      { userId: "user-1", name: "Opérateur Club" },
    );

    expect(signature.recordedByUserId).toBe("user-1");
    expect(signature.recordedByName).toBe("Opérateur Club");
    expect(signature.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("une re-signature insère une nouvelle ligne au lieu d'écraser l'ancienne", async () => {
    const { SignatureService } = await import("./SignatureService");
    const { match, sheet } = await seedBaseGraph(dataSource);

    const service = new SignatureService();
    await service.save(
      sheet.id,
      match.id,
      "PRE_MATCH",
      "REFEREE",
      { signerName: "M. Arbitre", signatureData: "data:image/png;base64,first" },
      { userId: "user-1", name: "Opérateur" },
    );
    await service.save(
      sheet.id,
      match.id,
      "PRE_MATCH",
      "REFEREE",
      { signerName: "M. Arbitre", signatureData: "data:image/png;base64,corrected" },
      { userId: "user-1", name: "Opérateur" },
    );

    const history = await service.findHistoryBySheet(sheet.id);
    expect(history).toHaveLength(2);
    expect(history[0].signatureData).toBe("data:image/png;base64,first");
    expect(history[1].signatureData).toBe("data:image/png;base64,corrected");
  });

  it("findBySheet ne renvoie que la signature la plus récente par (phase, actorRole)", async () => {
    const { SignatureService } = await import("./SignatureService");
    const { match, sheet } = await seedBaseGraph(dataSource);

    const service = new SignatureService();
    await service.save(
      sheet.id,
      match.id,
      "PRE_MATCH",
      "REFEREE",
      { signerName: "M. Arbitre", signatureData: "data:image/png;base64,old" },
      { userId: "user-1", name: "Opérateur" },
    );
    await service.save(
      sheet.id,
      match.id,
      "PRE_MATCH",
      "REFEREE",
      { signerName: "M. Arbitre", signatureData: "data:image/png;base64,new" },
      { userId: "user-1", name: "Opérateur" },
    );

    const current = await service.findBySheet(sheet.id);
    expect(current).toHaveLength(1);
    expect(current[0].signatureData).toBe("data:image/png;base64,new");
  });

  it("le contentHash change si un événement est ajouté à la feuille entre deux signatures", async () => {
    const { SignatureService, computeSheetContentHash } = await import("./SignatureService");
    const { match, sheet, homeTeam, player } = await seedBaseGraph(dataSource);

    const service = new SignatureService();
    const before = await service.save(
      sheet.id,
      match.id,
      "POST_MATCH",
      "REFEREE",
      { signerName: "M. Arbitre", signatureData: "data:image/png;base64,x" },
      { userId: "user-1", name: "Opérateur" },
    );

    await dataSource.getRepository(Goal).save(
      dataSource.getRepository(Goal).create({
        sheetId: sheet.id,
        matchId: match.id,
        teamId: homeTeam.id,
        playerId: player.id,
        minute: 42,
        period: "H1",
        isOwnGoal: false,
        isPenalty: false,
      }),
    );

    const after = await computeSheetContentHash(sheet.id, match.id);
    expect(after).not.toBe(before.contentHash);
  });

  it("isPhaseComplete compte les rôles distincts, pas les lignes (une re-signature ne fausse pas le compte)", async () => {
    const { SignatureService } = await import("./SignatureService");
    const { match, sheet } = await seedBaseGraph(dataSource);

    const service = new SignatureService();
    await service.save(
      sheet.id,
      match.id,
      "PRE_MATCH",
      "REFEREE",
      { signerName: "R", signatureData: "d1" },
      { userId: "u1", name: "R" },
    );
    await service.save(
      sheet.id,
      match.id,
      "PRE_MATCH",
      "REFEREE",
      { signerName: "R", signatureData: "d2" }, // re-signature du même rôle
      { userId: "u1", name: "R" },
    );

    expect(await service.isPhaseComplete(sheet.id, "PRE_MATCH")).toBe(false);

    await service.save(
      sheet.id,
      match.id,
      "PRE_MATCH",
      "TEAM_HOME",
      { signerName: "H", signatureData: "d3" },
      { userId: "u2", name: "H" },
    );
    await service.save(
      sheet.id,
      match.id,
      "PRE_MATCH",
      "TEAM_AWAY",
      { signerName: "A", signatureData: "d4" },
      { userId: "u3", name: "A" },
    );

    expect(await service.isPhaseComplete(sheet.id, "PRE_MATCH")).toBe(true);
  });
});

describe("computeSheetContentHash", () => {
  it("est déterministe pour un même contenu", async () => {
    const { computeSheetContentHash } = await import("./SignatureService");
    const { match, sheet } = await seedBaseGraph(dataSource);

    const first = await computeSheetContentHash(sheet.id, match.id);
    const second = await computeSheetContentHash(sheet.id, match.id);

    expect(first).toBe(second);
  });
});
