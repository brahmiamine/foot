import { beforeEach, describe, expect, it, vi } from "vitest";
import { MediaGallery } from "@/entities/MediaGallery";
import { MediaGalleryItem } from "@/entities/MediaGalleryItem";

const galleryFindOne = vi.fn();
const galleryItemFindOne = vi.fn();
const galleryItemRemove = vi.fn();
const galleryItemSave = vi.fn();

vi.mock("@/lib/database", () => ({
  getDataSource: async () => ({
    getRepository: (entity: unknown) => {
      if (entity === MediaGallery) return { findOne: galleryFindOne };
      if (entity === MediaGalleryItem) {
        return { findOne: galleryItemFindOne, remove: galleryItemRemove, save: galleryItemSave };
      }
      throw new Error("unexpected entity");
    },
  }),
}));

beforeEach(() => {
  galleryFindOne.mockReset();
  galleryItemFindOne.mockReset();
  galleryItemRemove.mockReset();
  galleryItemSave.mockReset();
});

/**
 * TASK-P0-012 (todo.md): removeItemFromGallery/updateItemOrder used to
 * trust galleryId alone, with no check that the gallery belonged to the
 * caller's team — any staff member of any club could tamper with another
 * club's gallery just by guessing its numeric id.
 */
describe("MediaGalleryService cross-team guards", () => {
  it("removeItemFromGallery refuses when the gallery doesn't belong to the caller's team", async () => {
    galleryFindOne.mockResolvedValue(null); // findById(galleryId, teamId) scopes by team internally
    const { MediaGalleryService } = await import("./MediaGalleryService");
    const service = new MediaGalleryService();

    await expect(service.removeItemFromGallery(1, 2, "team-attacker")).rejects.toThrow(
      "Galerie non trouvée",
    );
    expect(galleryItemFindOne).not.toHaveBeenCalled();
    expect(galleryItemRemove).not.toHaveBeenCalled();
  });

  it("removeItemFromGallery succeeds when the gallery belongs to the caller's team", async () => {
    galleryFindOne.mockResolvedValue({ id: 1, teamId: "team-owner" });
    galleryItemFindOne.mockResolvedValue({ galleryId: 1, mediaItemId: 2 });
    const { MediaGalleryService } = await import("./MediaGalleryService");
    const service = new MediaGalleryService();

    await service.removeItemFromGallery(1, 2, "team-owner");

    expect(galleryItemRemove).toHaveBeenCalledWith({ galleryId: 1, mediaItemId: 2 });
  });

  it("updateItemOrder refuses when the gallery doesn't belong to the caller's team", async () => {
    galleryFindOne.mockResolvedValue(null);
    const { MediaGalleryService } = await import("./MediaGalleryService");
    const service = new MediaGalleryService();

    await expect(
      service.updateItemOrder(1, [{ mediaItemId: 2, displayOrder: 0 }], "team-attacker"),
    ).rejects.toThrow("Galerie non trouvée");
    expect(galleryItemSave).not.toHaveBeenCalled();
  });
});
