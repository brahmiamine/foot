import { In } from "typeorm";
import { getDataSource } from "@/lib/database";
import { MediaGallery } from "@/entities/MediaGallery";
import { MediaGalleryItem } from "@/entities/MediaGalleryItem";

export type GalleryPhoto = { id: number; url: string; alt: string | null };

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
      .map((item) => ({ id: item.mediaItem.id, url: item.mediaItem.url, alt: item.mediaItem.altTextFr ?? null }));
  }
}
