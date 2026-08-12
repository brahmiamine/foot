import { getDataSource } from "@/lib/database";
import { News } from "@/entities/News";
import { NewsMedia } from "@/entities/NewsMedia";
import { MediaItem } from "@/entities/MediaItem";
import { EntityManager, Repository } from "typeorm";

/**
 * Service for News operations
 * Handles all database operations for news articles (scoped to a team)
 */
export class NewsService {
  private async getRepository(): Promise<Repository<News>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(News);
  }

  /**
   * Get all news articles of a team
   */
  async findAll(teamId: string): Promise<News[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { teamId },
      order: {
        createdAt: "DESC",
      },
    });
  }

  /**
   * Get a news article by ID (must belong to the given team)
   */
  async findById(id: number, teamId: string): Promise<News | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  /**
   * Create a new news article.
   *
   * `manager` : passer l'EntityManager d'une transaction en cours (voir
   * `dataSource.transaction(...)`) pour committer cette écriture avec
   * d'autres dans la même transaction — ex: l'outbox notification (TS-25,
   * voir app/admin/news/actions.ts). Sans `manager`, se comporte comme
   * avant (repository indépendant, sa propre transaction implicite).
   */
  async create(
    data: {
      title: string;
      contentHtml: string;
      coverImage?: string | null;
      authorId?: number | null;
      status?: "DRAFT" | "PUBLISHED";
      isPublished?: boolean;
      publishedAt?: Date | null;
    },
    teamId: string,
    manager?: EntityManager
  ): Promise<News> {
    const repository = manager ? manager.getRepository(News) : await this.getRepository();

    const news = repository.create({
      teamId,
      title: data.title,
      contentHtml: data.contentHtml,
      coverImage: data.coverImage || null,
      authorId: data.authorId || null,
      status: data.status || "DRAFT",
      isPublished: data.isPublished || false,
      publishedAt: data.publishedAt || null,
    });

    return repository.save(news);
  }

  /**
   * Update a news article. `manager` : voir create() ci-dessus.
   */
  async update(
    id: number,
    teamId: string,
    data: {
      title?: string;
      contentHtml?: string;
      coverImage?: string | null;
      authorId?: number | null;
      status?: "DRAFT" | "PUBLISHED";
      isPublished?: boolean;
      publishedAt?: Date | null;
    },
    manager?: EntityManager
  ): Promise<News> {
    const repository = manager ? manager.getRepository(News) : await this.getRepository();
    const news = await repository.findOne({ where: { id, teamId } });

    if (!news) {
      throw new Error("Actualité non trouvée");
    }

    Object.assign(news, data);
    return repository.save(news);
  }

  /**
   * Delete a news article
   */
  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const news = await this.findById(id, teamId);

    if (!news) {
      throw new Error("Actualité non trouvée");
    }

    // NewsMedia will be deleted automatically due to CASCADE
    await repository.remove(news);
    return true;
  }

  /**
   * Get repository for NewsMedia
   */
  private async getNewsMediaRepository(): Promise<Repository<NewsMedia>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(NewsMedia);
  }

  /**
   * Get repository for MediaItem
   */
  private async getMediaItemRepository(): Promise<Repository<MediaItem>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MediaItem);
  }

  /**
   * Get all media items associated with a news article
   */
  async getNewsMedia(newsId: number, teamId: string): Promise<NewsMedia[]> {
    const repository = await this.getNewsMediaRepository();

    // Check if news exists (and belongs to the given team)
    const news = await this.findById(newsId, teamId);
    if (!news) {
      throw new Error("Actualité non trouvée");
    }

    return repository.find({
      where: { newsId },
      relations: ["mediaItem"],
      order: {
        displayOrder: "ASC",
      },
    });
  }

  /**
   * Add a media item to a news article
   */
  async addMediaToNews(newsId: number, mediaItemId: number, teamId: string, displayOrder: number = 0): Promise<NewsMedia> {
    const repository = await this.getNewsMediaRepository();

    // Check if news exists (and belongs to the given team)
    const news = await this.findById(newsId, teamId);
    if (!news) {
      throw new Error("Actualité non trouvée");
    }

    // Check if media item exists (and belongs to the given team)
    const mediaItemRepo = await this.getMediaItemRepository();
    const mediaItem = await mediaItemRepo.findOne({ where: { id: mediaItemId, teamId } });
    if (!mediaItem) {
      throw new Error("Élément média non trouvé");
    }

    // Check if item already in news
    const existing = await repository.findOne({
      where: { newsId, mediaItemId },
    });
    if (existing) {
      throw new Error("Cet élément est déjà associé à cette actualité");
    }

    const newsMedia = repository.create({
      newsId,
      mediaItemId,
      displayOrder,
    });

    return repository.save(newsMedia);
  }

  /**
   * Remove a media item from a news article
   */
  async removeMediaFromNews(newsId: number, mediaItemId: number): Promise<boolean> {
    const repository = await this.getNewsMediaRepository();
    const newsMedia = await repository.findOne({
      where: { newsId, mediaItemId },
    });

    if (!newsMedia) {
      throw new Error("Élément non trouvé dans cette actualité");
    }

    await repository.remove(newsMedia);
    return true;
  }

  /**
   * Update display order of media items in a news article
   */
  async updateNewsMediaOrder(newsId: number, items: Array<{ mediaItemId: number; displayOrder: number }>): Promise<NewsMedia[]> {
    const repository = await this.getNewsMediaRepository();

    // Update each item's order
    const updatedItems: NewsMedia[] = [];
    for (const item of items) {
      const newsMedia = await repository.findOne({
        where: { newsId, mediaItemId: item.mediaItemId },
      });

      if (newsMedia) {
        newsMedia.displayOrder = item.displayOrder;
        updatedItems.push(await repository.save(newsMedia));
      }
    }

    return updatedItems;
  }
}
