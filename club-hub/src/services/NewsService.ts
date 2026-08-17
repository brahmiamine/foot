import { getDataSource } from "@/lib/database";
import { News, type NewsEditorialStatus } from "@/entities/News";
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

  async findAll(teamId: string): Promise<News[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { teamId },
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: number, teamId: string): Promise<News | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  async create(
    data: {
      title: string;
      contentHtml: string;
      coverImage?: string | null;
      authorId?: number | null;
      status?: "DRAFT" | "PUBLISHED";
      editorialStatus?: NewsEditorialStatus;
      isPublished?: boolean;
      publishedAt?: Date | null;
      scheduledAt?: Date | null;
    },
    teamId: string,
    manager?: EntityManager,
  ): Promise<News> {
    const repository = manager ? manager.getRepository(News) : await this.getRepository();

    const news = repository.create({
      teamId,
      title: data.title,
      contentHtml: data.contentHtml,
      coverImage: data.coverImage || null,
      authorId: data.authorId || null,
      status: data.status || "DRAFT",
      editorialStatus: data.editorialStatus || (data.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"),
      isPublished: data.isPublished || false,
      publishedAt: data.publishedAt || null,
      scheduledAt: data.scheduledAt || null,
    });

    return repository.save(news);
  }

  async update(
    id: number,
    teamId: string,
    data: {
      title?: string;
      contentHtml?: string;
      coverImage?: string | null;
      authorId?: number | null;
      status?: "DRAFT" | "PUBLISHED";
      editorialStatus?: NewsEditorialStatus;
      isPublished?: boolean;
      publishedAt?: Date | null;
      scheduledAt?: Date | null;
    },
    manager?: EntityManager,
  ): Promise<News> {
    const repository = manager ? manager.getRepository(News) : await this.getRepository();
    const news = await repository.findOne({ where: { id, teamId } });

    if (!news) throw new Error("Actualité non trouvée");

    Object.assign(news, data);
    return repository.save(news);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const news = await this.findById(id, teamId);
    if (!news) throw new Error("Actualité non trouvée");
    await repository.remove(news);
    return true;
  }

  private async getNewsMediaRepository(): Promise<Repository<NewsMedia>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(NewsMedia);
  }

  private async getMediaItemRepository(): Promise<Repository<MediaItem>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MediaItem);
  }

  async getNewsMedia(newsId: number, teamId: string): Promise<NewsMedia[]> {
    const repository = await this.getNewsMediaRepository();
    const news = await this.findById(newsId, teamId);
    if (!news) throw new Error("Actualité non trouvée");

    return repository.find({
      where: { newsId },
      relations: ["mediaItem"],
      order: { displayOrder: "ASC" },
    });
  }

  async addMediaToNews(newsId: number, mediaItemId: number, teamId: string, displayOrder: number = 0): Promise<NewsMedia> {
    const repository = await this.getNewsMediaRepository();
    const news = await this.findById(newsId, teamId);
    if (!news) throw new Error("Actualité non trouvée");

    const mediaItemRepo = await this.getMediaItemRepository();
    const mediaItem = await mediaItemRepo.findOne({ where: { id: mediaItemId, teamId } });
    if (!mediaItem) throw new Error("Élément média non trouvé");

    const existing = await repository.findOne({ where: { newsId, mediaItemId } });
    if (existing) throw new Error("Cet élément est déjà associé à cette actualité");

    return repository.save(repository.create({ newsId, mediaItemId, displayOrder }));
  }

  async removeMediaFromNews(newsId: number, mediaItemId: number, teamId: string): Promise<boolean> {
    const news = await this.findById(newsId, teamId);
    if (!news) throw new Error("Actualité non trouvée");

    const repository = await this.getNewsMediaRepository();
    const newsMedia = await repository.findOne({ where: { newsId, mediaItemId } });
    if (!newsMedia) throw new Error("Élément non trouvé dans cette actualité");

    await repository.remove(newsMedia);
    return true;
  }

  async updateNewsMediaOrder(
    newsId: number,
    items: Array<{ mediaItemId: number; displayOrder: number }>,
    teamId: string,
  ): Promise<NewsMedia[]> {
    const news = await this.findById(newsId, teamId);
    if (!news) throw new Error("Actualité non trouvée");

    const repository = await this.getNewsMediaRepository();
    const updatedItems: NewsMedia[] = [];
    for (const item of items) {
      const newsMedia = await repository.findOne({ where: { newsId, mediaItemId: item.mediaItemId } });
      if (newsMedia) {
        newsMedia.displayOrder = item.displayOrder;
        updatedItems.push(await repository.save(newsMedia));
      }
    }
    return updatedItems;
  }
}
