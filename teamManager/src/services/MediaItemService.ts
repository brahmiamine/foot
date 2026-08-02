import { getDataSource } from "@/lib/database";
import { MediaItem } from "@/entities/MediaItem";
import { Repository } from "typeorm";

/**
 * Service for MediaItem operations
 * Handles all database operations for media items (scoped to a team)
 */
export class MediaItemService {
  private async getRepository(): Promise<Repository<MediaItem>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MediaItem);
  }

  /**
   * Get all media items of a team
   */
  async findAll(teamId: string): Promise<MediaItem[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { teamId },
      order: {
        createdAt: "DESC",
      },
    });
  }

  /**
   * Get media items by type
   */
  async findByType(type: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO", teamId: string): Promise<MediaItem[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { type, teamId },
      order: {
        createdAt: "DESC",
      },
    });
  }

  /**
   * Get media items by uploader
   */
  async findByUploader(uploaderId: number, teamId: string): Promise<MediaItem[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { uploaderId, teamId },
      order: {
        createdAt: "DESC",
      },
    });
  }

  /**
   * Get a media item by ID (must belong to the given team)
   */
  async findById(id: number, teamId: string): Promise<MediaItem | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  /**
   * Create a new media item
   */
  async create(
    data: {
      url: string;
      type: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";
      mimeType?: string | null;
      altTextFr?: string | null;
      altTextAr?: string | null;
      uploaderId?: number | null;
    },
    teamId: string
  ): Promise<MediaItem> {
    const repository = await this.getRepository();
    const mediaItem = repository.create({ ...data, teamId });
    return repository.save(mediaItem);
  }

  /**
   * Update a media item
   */
  async update(
    id: number,
    teamId: string,
    data: {
      url?: string;
      type?: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";
      mimeType?: string | null;
      altTextFr?: string | null;
      altTextAr?: string | null;
    }
  ): Promise<MediaItem> {
    const repository = await this.getRepository();
    const mediaItem = await this.findById(id, teamId);

    if (!mediaItem) {
      throw new Error("Élément média non trouvé");
    }

    Object.assign(mediaItem, data);
    return repository.save(mediaItem);
  }

  /**
   * Delete a media item
   */
  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const mediaItem = await this.findById(id, teamId);

    if (!mediaItem) {
      throw new Error("Élément média non trouvé");
    }

    await repository.remove(mediaItem);
    return true;
  }
}
