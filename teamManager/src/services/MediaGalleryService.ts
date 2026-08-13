import { getDataSource } from "@/lib/database";
import { MediaGallery } from "@/entities/MediaGallery";
import { MediaGalleryItem } from "@/entities/MediaGalleryItem";
import { MediaItem } from "@/entities/MediaItem";
import { Repository } from "typeorm";

/**
 * Service for MediaGallery operations
 * Handles all database operations for media galleries (scoped to a team)
 */
export class MediaGalleryService {
  private async getGalleryRepository(): Promise<Repository<MediaGallery>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MediaGallery);
  }

  private async getGalleryItemRepository(): Promise<Repository<MediaGalleryItem>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MediaGalleryItem);
  }

  private async getMediaItemRepository(): Promise<Repository<MediaItem>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MediaItem);
  }

  /**
   * Get all galleries of a team
   */
  async findAll(teamId: string): Promise<MediaGallery[]> {
    const repository = await this.getGalleryRepository();
    return repository.find({
      where: { teamId },
      relations: ["coverImage"],
      order: {
        createdAt: "DESC",
      },
    });
  }

  /**
   * Get public galleries only
   */
  async findPublicGalleries(teamId: string): Promise<MediaGallery[]> {
    const repository = await this.getGalleryRepository();
    return repository.find({
      where: { isPublic: true, teamId },
      relations: ["coverImage"],
      order: {
        createdAt: "DESC",
      },
    });
  }

  /**
   * Get a gallery by ID (must belong to the given team)
   */
  async findById(id: number, teamId: string): Promise<MediaGallery | null> {
    const repository = await this.getGalleryRepository();
    return repository.findOne({
      where: { id, teamId },
      relations: ["coverImage"],
    });
  }

  /**
   * Get all items in a gallery
   */
  async getGalleryItems(galleryId: number): Promise<MediaGalleryItem[]> {
    const repository = await this.getGalleryItemRepository();
    return repository.find({
      where: { galleryId },
      relations: ["mediaItem"],
      order: {
        displayOrder: "ASC",
      },
    });
  }

  /**
   * Create a new gallery
   */
  async create(
    data: {
      titleFr: string;
      titleAr?: string | null;
      descriptionFr?: string | null;
      descriptionAr?: string | null;
      coverImageId?: number | null;
      isPublic?: boolean;
    },
    teamId: string
  ): Promise<MediaGallery> {
    const repository = await this.getGalleryRepository();

    // Validate cover image if provided
    if (data.coverImageId) {
      const mediaItemRepo = await this.getMediaItemRepository();
      const coverImage = await mediaItemRepo.findOne({ where: { id: data.coverImageId, teamId } });
      if (!coverImage) {
        throw new Error("Image de couverture non trouvée");
      }
    }

    const gallery = repository.create({ ...data, teamId });
    return repository.save(gallery);
  }

  /**
   * Update a gallery
   */
  async update(
    id: number,
    teamId: string,
    data: {
      titleFr?: string;
      titleAr?: string | null;
      descriptionFr?: string | null;
      descriptionAr?: string | null;
      coverImageId?: number | null;
      isPublic?: boolean;
    }
  ): Promise<MediaGallery> {
    const repository = await this.getGalleryRepository();
    const gallery = await this.findById(id, teamId);

    if (!gallery) {
      throw new Error("Galerie non trouvée");
    }

    // Validate cover image if provided
    if (data.coverImageId !== undefined) {
      if (data.coverImageId !== null) {
        const mediaItemRepo = await this.getMediaItemRepository();
        const coverImage = await mediaItemRepo.findOne({ where: { id: data.coverImageId, teamId } });
        if (!coverImage) {
          throw new Error("Image de couverture non trouvée");
        }
      }
    }

    Object.assign(gallery, data);
    return repository.save(gallery);
  }

  /**
   * Set cover image for a gallery
   */
  async setCoverImage(galleryId: number, teamId: string, coverImageId: number | null): Promise<MediaGallery> {
    return this.update(galleryId, teamId, { coverImageId });
  }

  /**
   * Add a media item to a gallery
   */
  async addItemToGallery(galleryId: number, mediaItemId: number, teamId: string, displayOrder: number = 0): Promise<MediaGalleryItem> {
    const galleryItemRepo = await this.getGalleryItemRepository();

    // Check if gallery exists (and belongs to the given team)
    const gallery = await this.findById(galleryId, teamId);
    if (!gallery) {
      throw new Error("Galerie non trouvée");
    }

    // Check if media item exists (and belongs to the given team)
    const mediaItemRepo = await this.getMediaItemRepository();
    const mediaItem = await mediaItemRepo.findOne({ where: { id: mediaItemId, teamId } });
    if (!mediaItem) {
      throw new Error("Élément média non trouvé");
    }

    // Check if item already in gallery
    const existing = await galleryItemRepo.findOne({
      where: { galleryId, mediaItemId },
    });
    if (existing) {
      throw new Error("Cet élément est déjà dans la galerie");
    }

    const galleryItem = galleryItemRepo.create({
      galleryId,
      mediaItemId,
      displayOrder,
    });

    return galleryItemRepo.save(galleryItem);
  }

  /**
   * Remove a media item from a gallery
   */
  async removeItemFromGallery(galleryId: number, mediaItemId: number, teamId: string): Promise<boolean> {
    // Check if gallery exists (and belongs to the given team) — TASK-P0-012
    // (todo.md): without this, any staff member of any club could remove
    // items from another club's gallery just by guessing its numeric id.
    const gallery = await this.findById(galleryId, teamId);
    if (!gallery) {
      throw new Error("Galerie non trouvée");
    }

    const repository = await this.getGalleryItemRepository();
    const galleryItem = await repository.findOne({
      where: { galleryId, mediaItemId },
    });

    if (!galleryItem) {
      throw new Error("Élément non trouvé dans la galerie");
    }

    await repository.remove(galleryItem);
    return true;
  }

  /**
   * Update display order of items in a gallery
   */
  async updateItemOrder(
    galleryId: number,
    items: Array<{ mediaItemId: number; displayOrder: number }>,
    teamId: string
  ): Promise<MediaGalleryItem[]> {
    // TASK-P0-012 (todo.md): same cross-club guard as removeItemFromGallery.
    const gallery = await this.findById(galleryId, teamId);
    if (!gallery) {
      throw new Error("Galerie non trouvée");
    }

    const repository = await this.getGalleryItemRepository();

    // Update each item's order
    const updatedItems: MediaGalleryItem[] = [];
    for (const item of items) {
      const galleryItem = await repository.findOne({
        where: { galleryId, mediaItemId: item.mediaItemId },
      });

      if (galleryItem) {
        galleryItem.displayOrder = item.displayOrder;
        updatedItems.push(await repository.save(galleryItem));
      }
    }

    return updatedItems;
  }

  /**
   * Delete a gallery
   */
  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getGalleryRepository();
    const gallery = await this.findById(id, teamId);

    if (!gallery) {
      throw new Error("Galerie non trouvée");
    }

    // Gallery items will be deleted automatically due to CASCADE
    await repository.remove(gallery);
    return true;
  }
}
