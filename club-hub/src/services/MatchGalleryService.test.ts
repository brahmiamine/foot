import { beforeEach, describe, expect, it, vi } from "vitest";
import { Match } from "@/entities/Match";
import { MatchGallery } from "@/entities/MatchGallery";

const matchFindOne = vi.fn();
const matchGalleryFindOne = vi.fn();
const matchGalleryFind = vi.fn();
const matchGalleryRemove = vi.fn();

vi.mock("@/lib/database", () => ({
  getDataSource: async () => ({
    getRepository: (entity: unknown) => {
      if (entity === Match) return { findOne: matchFindOne };
      if (entity === MatchGallery) {
        return { findOne: matchGalleryFindOne, find: matchGalleryFind, remove: matchGalleryRemove };
      }
      throw new Error("unexpected entity");
    },
  }),
}));

beforeEach(() => {
  matchFindOne.mockReset();
  matchGalleryFindOne.mockReset();
  matchGalleryFind.mockReset();
  matchGalleryRemove.mockReset();
});

/**
 * TASK-P0-012 (todo.md): removeGalleryFromMatch/removeAllGalleriesFromMatch
 * used to trust matchId alone, with no check that the match involved the
 * caller's team — unlike addGalleryToMatch, which already scoped it.
 */
describe("MatchGalleryService cross-team guards", () => {
  it("removeGalleryFromMatch refuses when the match doesn't involve the caller's team", async () => {
    matchFindOne.mockResolvedValue(null); // Match.findById(id, teamId) not matching -> null
    const { MatchGalleryService } = await import("./MatchGalleryService");
    const service = new MatchGalleryService();

    await expect(service.removeGalleryFromMatch("match-1", 2, "team-attacker")).rejects.toThrow(
      "Match non trouvé",
    );
    expect(matchGalleryFindOne).not.toHaveBeenCalled();
    expect(matchGalleryRemove).not.toHaveBeenCalled();
  });

  it("removeGalleryFromMatch succeeds when the match involves the caller's team", async () => {
    matchFindOne.mockResolvedValue({
      id: "match-1",
      equipeHome: "team-owner",
      equipeAway: "team-other",
    });
    matchGalleryFindOne.mockResolvedValue({ matchId: "match-1", galleryId: 2 });
    const { MatchGalleryService } = await import("./MatchGalleryService");
    const service = new MatchGalleryService();

    await service.removeGalleryFromMatch("match-1", 2, "team-owner");

    expect(matchGalleryRemove).toHaveBeenCalledWith({ matchId: "match-1", galleryId: 2 });
  });

  it("removeAllGalleriesFromMatch refuses when the match doesn't involve the caller's team", async () => {
    matchFindOne.mockResolvedValue(null);
    const { MatchGalleryService } = await import("./MatchGalleryService");
    const service = new MatchGalleryService();

    await expect(
      service.removeAllGalleriesFromMatch("match-1", "team-attacker"),
    ).rejects.toThrow("Match non trouvé");
    expect(matchGalleryFind).not.toHaveBeenCalled();
  });
});
