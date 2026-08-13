import { beforeEach, describe, expect, it, vi } from "vitest";
import { Convocation } from "@/entities/Convocation";
import { Match } from "@/entities/Match";

const execute = vi.fn();
const andWhere = vi.fn(() => ({ andWhere, execute }));
const where = vi.fn(() => ({ andWhere, execute }));
const set = vi.fn(() => ({ where }));
const update = vi.fn(() => ({ set }));
const createQueryBuilder = vi.fn(() => ({ update }));

const findOne = vi.fn();
const save = vi.fn((data: unknown) => data);
const count = vi.fn();
const matchFind = vi.fn();

vi.mock("@/lib/database", () => ({
  getDataSource: async () => ({
    getRepository: (entity: unknown) => {
      if (entity === Convocation) {
        return { createQueryBuilder, findOne, save, count };
      }
      if (entity === Match) {
        return { find: matchFind };
      }
      throw new Error("unexpected entity");
    },
  }),
}));

beforeEach(() => {
  execute.mockReset().mockResolvedValue({ affected: 3 });
  andWhere.mockClear();
  where.mockClear();
  set.mockClear();
  update.mockClear();
  createQueryBuilder.mockClear();
  findOne.mockReset();
  save.mockClear();
  count.mockReset();
  matchFind.mockReset();
});

/**
 * TASK-P0-003 (todo.md) : ConvocationService.cancelForMatch annule (soft)
 * toutes les convocations d'un match officiel annulé, tous clubs confondus
 * — appelée par POST /api/internal/matches/[matchId]/cancel-convocations
 * (superadmin, cancelMatchAdmin).
 */
describe("ConvocationService.cancelForMatch", () => {
  it("filtre par match_id, match_type OFFICIAL et cancelled_at IS NULL (idempotence)", async () => {
    const { ConvocationService } = await import("./ConvocationService");
    const service = new ConvocationService();

    const result = await service.cancelForMatch("match-1", "Match annulé : terrain indisponible.");

    expect(result).toBe(3);
    expect(where).toHaveBeenCalledWith("match_id = :matchId", { matchId: "match-1" });
    expect(andWhere).toHaveBeenCalledWith("match_type = :matchType", { matchType: "OFFICIAL" });
    expect(andWhere).toHaveBeenCalledWith("cancelled_at IS NULL");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ cancelledReason: "Match annulé : terrain indisponible." }),
    );
  });

  it("renvoie 0 sans lever quand aucune convocation n'est concernée (déjà toutes annulées)", async () => {
    execute.mockResolvedValue({ affected: 0 });
    const { ConvocationService } = await import("./ConvocationService");
    const service = new ConvocationService();

    await expect(service.cancelForMatch("match-1", "Match annulé.")).resolves.toBe(0);
  });
});

describe("ConvocationService.reconcileCancelledMatches — filet de sécurité", () => {
  it("rattrape un match CANCELLED avec des convocations encore actives", async () => {
    matchFind.mockResolvedValue([{ id: "match-1", status: "CANCELLED" }]);
    count.mockResolvedValue(2);
    const { ConvocationService } = await import("./ConvocationService");
    const service = new ConvocationService();

    const report = await service.reconcileCancelledMatches();

    expect(report.matchesScanned).toBe(1);
    expect(report.cancelled).toBe(3); // execute() mocké renvoie affected: 3
    expect(where).toHaveBeenCalledWith("match_id = :matchId", { matchId: "match-1" });
  });

  it("ne retouche pas un match déjà entièrement traité", async () => {
    matchFind.mockResolvedValue([{ id: "match-1", status: "CANCELLED" }]);
    count.mockResolvedValue(0);
    const { ConvocationService } = await import("./ConvocationService");
    const service = new ConvocationService();

    const report = await service.reconcileCancelledMatches();

    expect(report.matchesScanned).toBe(0);
    expect(createQueryBuilder).not.toHaveBeenCalled();
  });
});

describe("ConvocationService.updateResponse — refuse une convocation annulée", () => {
  it("rejette une réponse sur une convocation déjà annulée", async () => {
    findOne.mockResolvedValue({ id: 1, teamId: "team-1", cancelledAt: new Date() });
    const { ConvocationService } = await import("./ConvocationService");
    const service = new ConvocationService();

    await expect(service.updateResponse(1, "team-1", "PRESENT")).rejects.toThrow(
      "annulée",
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("accepte une réponse sur une convocation non annulée", async () => {
    findOne.mockResolvedValue({ id: 1, teamId: "team-1", cancelledAt: null });
    const { ConvocationService } = await import("./ConvocationService");
    const service = new ConvocationService();

    const result = await service.updateResponse(1, "team-1", "PRESENT");

    expect(result.response).toBe("PRESENT");
    expect(save).toHaveBeenCalled();
  });
});
