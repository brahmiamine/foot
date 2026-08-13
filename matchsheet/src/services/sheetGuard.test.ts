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
 * TASK-P0-003 (todo.md) : un match CANCELLED (écrit par superadmin dans la
 * table `matches` partagée) bloque la saisie live même si la feuille
 * elle-même n'est pas CLOSED (ex. annulation avant coup d'envoi, feuille
 * encore DRAFT/PRE_MATCH_SIGNED).
 */
describe("assertSheetEditable — match annulé (TASK-P0-003)", () => {
  it("laisse passer tant que le match n'est pas annulé", async () => {
    const { assertSheetEditable } = await import("./sheetGuard");
    const { sheet } = await seedBaseGraph(dataSource);

    await expect(assertSheetEditable(sheet.id)).resolves.toBeUndefined();
  });

  it("refuse la saisie une fois le match CANCELLED, même si la feuille reste DRAFT", async () => {
    const { assertSheetEditable, MatchCancelledError } = await import("./sheetGuard");
    const { match, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "DRAFT" });
    await dataSource.getRepository(Match).update(match.id, { status: "CANCELLED" });

    await expect(assertSheetEditable(sheet.id)).rejects.toThrow(MatchCancelledError);
  });

  it("le statut CLOSED de la feuille reste prioritaire (message dédié) sur un match non annulé", async () => {
    const { assertSheetEditable, SheetClosedError } = await import("./sheetGuard");
    const { sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Sheet).update(sheet.id, { status: "CLOSED" });

    await expect(assertSheetEditable(sheet.id)).rejects.toThrow(SheetClosedError);
  });

  it("les services de saisie live (Goal/Injury/Substitution) refusent aussi sur un match annulé", async () => {
    const { GoalService } = await import("./GoalService");
    const { MatchCancelledError } = await import("./sheetGuard");
    const { match, homeTeam, player, sheet } = await seedBaseGraph(dataSource);
    await dataSource.getRepository(Match).update(match.id, { status: "CANCELLED" });

    const service = new GoalService();
    await expect(
      service.create({ sheetId: sheet.id, matchId: match.id, teamId: homeTeam.id, playerId: player.id, minute: 12, period: "H1" }),
    ).rejects.toThrow(MatchCancelledError);
  });
});
