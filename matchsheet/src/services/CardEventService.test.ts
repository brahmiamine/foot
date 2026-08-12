import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedBaseGraph } from "@/test/fixtures";

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

describe("CardEventService (SQLite réel)", () => {
  it("create() enregistre un carton avec createdBy='matchsheet'", async () => {
    const { CardEventService } = await import("./CardEventService");
    const { match, player, sheet } = await seedBaseGraph(dataSource);
    const service = new CardEventService();

    const card = await service.create({
      sheetId: sheet.id,
      matchId: match.id,
      playerId: player.id,
      type: "YELLOW",
      minute: 23,
      period: "H1",
      cardReasonId: null,
      commentFr: null,
    });

    expect(card.id).toBeTruthy();
    expect(card.createdBy).toBe("matchsheet");
    // better-sqlite3 renvoie 0/1 bruts pour `tinyint` (contrairement au
    // driver MySQL réel, qui convertit en booléen) — Boolean(...) isole le
    // comportement testé de cette particularité du driver de test.
    expect(Boolean(card.isNeutralized)).toBe(false);
  });

  it("create() refuse un deuxième carton du même type pour le même joueur/match (DuplicateCardError)", async () => {
    const { CardEventService, DuplicateCardError } = await import("./CardEventService");
    const { match, player, sheet } = await seedBaseGraph(dataSource);
    const service = new CardEventService();

    await service.create({
      sheetId: sheet.id,
      matchId: match.id,
      playerId: player.id,
      type: "RED",
      minute: 60,
      period: "H2",
      cardReasonId: null,
      commentFr: null,
    });

    await expect(
      service.create({
        sheetId: sheet.id,
        matchId: match.id,
        playerId: player.id,
        type: "RED",
        minute: 61,
        period: "H2",
        cardReasonId: null,
        commentFr: null,
      }),
    ).rejects.toThrow(DuplicateCardError);
  });

  it("create() autorise deux types différents pour le même joueur/match (YELLOW puis DOUBLE_YELLOW)", async () => {
    const { CardEventService } = await import("./CardEventService");
    const { match, player, sheet } = await seedBaseGraph(dataSource);
    const service = new CardEventService();

    await service.create({
      sheetId: sheet.id,
      matchId: match.id,
      playerId: player.id,
      type: "YELLOW",
      minute: 20,
      period: "H1",
      cardReasonId: null,
      commentFr: null,
    });
    const second = await service.create({
      sheetId: sheet.id,
      matchId: match.id,
      playerId: player.id,
      type: "DOUBLE_YELLOW",
      minute: 75,
      period: "H2",
      cardReasonId: null,
      commentFr: null,
    });

    expect(second.type).toBe("DOUBLE_YELLOW");
    const all = await service.findByMatch(match.id);
    expect(all).toHaveLength(2);
  });

  it("findByMatch() trie par minute croissante", async () => {
    const { CardEventService } = await import("./CardEventService");
    const { match, player, awayTeam, sheet } = await seedBaseGraph(dataSource);
    const playerRepo = dataSource.getRepository((await import("@/entities/Player")).Player);
    const otherPlayer = await playerRepo.save(
      playerRepo.create({
        id: "p2",
        firstNameFr: "Karim",
        lastNameFr: "Trabelsi",
        number: 7,
        teamId: awayTeam.id,
        status: "TITULAR",
        isActive: true,
      }),
    );
    const service = new CardEventService();

    await service.create({ sheetId: sheet.id, matchId: match.id, playerId: player.id, type: "YELLOW", minute: 70, period: "H2", cardReasonId: null, commentFr: null });
    await service.create({ sheetId: sheet.id, matchId: match.id, playerId: otherPlayer.id, type: "YELLOW", minute: 15, period: "H1", cardReasonId: null, commentFr: null });

    const cards = await service.findByMatch(match.id);
    expect(cards.map((c) => c.minute)).toEqual([15, 70]);
  });

  it("delete() supprime le carton ; ré-appeler sur un id déjà supprimé ne lève pas", async () => {
    const { CardEventService } = await import("./CardEventService");
    const { match, player, sheet } = await seedBaseGraph(dataSource);
    const service = new CardEventService();

    const card = await service.create({ sheetId: sheet.id, matchId: match.id, playerId: player.id, type: "YELLOW", minute: 10, period: "H1", cardReasonId: null, commentFr: null });
    await service.delete(card.id);
    expect(await service.findByMatch(match.id)).toEqual([]);

    await expect(service.delete(card.id)).resolves.not.toThrow();
  });

  it("create() refuse toute écriture quand la feuille est CLOSED (SheetClosedError)", async () => {
    const { CardEventService } = await import("./CardEventService");
    const { SheetClosedError } = await import("./sheetGuard");
    const { Sheet } = await import("@/entities/Sheet");
    const { match, player, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "CLOSED" });
    const service = new CardEventService();

    await expect(
      service.create({ sheetId: sheet.id, matchId: match.id, playerId: player.id, type: "YELLOW", minute: 10, period: "H1", cardReasonId: null, commentFr: null }),
    ).rejects.toThrow(SheetClosedError);
  });
});
