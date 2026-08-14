import { beforeEach, describe, expect, it, vi } from "vitest";
import { News } from "@/entities/News";
import { NewsMedia } from "@/entities/NewsMedia";

const newsFindOne = vi.fn();
const newsMediaFindOne = vi.fn();
const newsMediaRemove = vi.fn();
const newsMediaSave = vi.fn();

vi.mock("@/lib/database", () => ({
  getDataSource: async () => ({
    getRepository: (entity: unknown) => {
      if (entity === News) return { findOne: newsFindOne };
      if (entity === NewsMedia) {
        return { findOne: newsMediaFindOne, remove: newsMediaRemove, save: newsMediaSave };
      }
      throw new Error("unexpected entity");
    },
  }),
}));

beforeEach(() => {
  newsFindOne.mockReset();
  newsMediaFindOne.mockReset();
  newsMediaRemove.mockReset();
  newsMediaSave.mockReset();
});

/**
 * TASK-P0-012 (todo.md): removeMediaFromNews/updateNewsMediaOrder used to
 * trust newsId alone, with no check that the article belonged to the
 * caller's team.
 */
describe("NewsService cross-team guards", () => {
  it("removeMediaFromNews refuses when the article doesn't belong to the caller's team", async () => {
    newsFindOne.mockResolvedValue(null); // findById(newsId, teamId) scopes by team internally
    const { NewsService } = await import("./NewsService");
    const service = new NewsService();

    await expect(service.removeMediaFromNews(1, 2, "team-attacker")).rejects.toThrow(
      "Actualité non trouvée",
    );
    expect(newsMediaFindOne).not.toHaveBeenCalled();
    expect(newsMediaRemove).not.toHaveBeenCalled();
  });

  it("removeMediaFromNews succeeds when the article belongs to the caller's team", async () => {
    newsFindOne.mockResolvedValue({ id: 1, teamId: "team-owner" });
    newsMediaFindOne.mockResolvedValue({ newsId: 1, mediaItemId: 2 });
    const { NewsService } = await import("./NewsService");
    const service = new NewsService();

    await service.removeMediaFromNews(1, 2, "team-owner");

    expect(newsMediaRemove).toHaveBeenCalledWith({ newsId: 1, mediaItemId: 2 });
  });

  it("updateNewsMediaOrder refuses when the article doesn't belong to the caller's team", async () => {
    newsFindOne.mockResolvedValue(null);
    const { NewsService } = await import("./NewsService");
    const service = new NewsService();

    await expect(
      service.updateNewsMediaOrder(1, [{ mediaItemId: 2, displayOrder: 0 }], "team-attacker"),
    ).rejects.toThrow("Actualité non trouvée");
    expect(newsMediaSave).not.toHaveBeenCalled();
  });
});
