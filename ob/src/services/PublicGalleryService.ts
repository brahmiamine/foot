import { In } from "typeorm";
import { getDataSource } from "@/lib/database";
import { MediaGallery } from "@/entities/MediaGallery";
import { MediaGalleryItem } from "@/entities/MediaGalleryItem";

export type GalleryPhoto = { id: number; url: string; altFr: string | null; altAr: string | null };
export type GalleryWithPhotos = { id: number; titleFr: string; titleAr: string | null; photos: GalleryPhoto[] };

export class PublicGalleryService {
  async getPhotos(teamId: string, limit = 5): Promise<GalleryPhoto[]> {
    const ds = await getDataSource();

    const galleries = await ds.getRepository(MediaGallery).find({ where: { teamId, isPublic: true } });
    if (galleries.length === 0) return [];

    const items = await ds.getRepository(MediaGalleryItem).find({
      where: { galleryId: In(galleries.map((g) => g.id)) },
      relations: ["mediaItem"],
      order: { displayOrder: "ASC" },
    });

    return items
      .filter((item) => item.mediaItem?.type === "IMAGE")
      .slice(0, limit)
      .map((item) => ({ id: item.mediaItem.id, url: item.mediaItem.url, altFr: item.mediaItem.altTextFr ?? null, altAr: item.mediaItem.altTextAr ?? null }));
  }

  /** Toutes les galeries publiques avec leurs photos, pour la page /galerie. */
  async getAllGalleries(teamId: string): Promise<GalleryWithPhotos[]> {
    const ds = await getDataSource();

    const galleries = await ds
      .getRepository(MediaGallery)
      .find({ where: { teamId, isPublic: true }, order: { createdAt: "DESC" } });
    if (galleries.length === 0) return [];

    const items = await ds.getRepository(MediaGalleryItem).find({
      where: { galleryId: In(galleries.map((g) => g.id)) },
      relations: ["mediaItem"],
      order: { displayOrder: "ASC" },
    });

    return galleries.map((gallery) => ({
      id: gallery.id,
      titleFr: gallery.titleFr,
      titleAr: gallery.titleAr ?? null,
      photos: items
        .filter((item) => item.galleryId === gallery.id && item.mediaItem?.type === "IMAGE")
        .map((item) => ({ id: item.mediaItem.id, url: item.mediaItem.url, altFr: item.mediaItem.altTextFr ?? null, altAr: item.mediaItem.altTextAr ?? null })),
    }));
  }
}
