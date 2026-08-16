import { getDataSource } from "@/lib/database";
import { cachePublicData } from "@/lib/public-cache";
import { News } from "@/entities/News";

export class PublicNewsService {
  private async repo() {
    const ds = await getDataSource();
    return ds.getRepository(News);
  }

  async getLatest(teamId: string, limit = 3): Promise<News[]> {
    return cachePublicData(["news", "latest", teamId, String(limit)], async () => {
      const repo = await this.repo();
      return repo.find({
        where: { teamId, isPublished: true },
        order: { publishedAt: "DESC", createdAt: "DESC" },
        take: limit,
      });
    }, 60);
  }

  async getAll(teamId: string): Promise<News[]> {
    return cachePublicData(["news", "all", teamId], async () => {
      const repo = await this.repo();
      return repo.find({
        where: { teamId, isPublished: true },
        order: { publishedAt: "DESC", createdAt: "DESC" },
      });
    }, 60);
  }

  async getById(id: number, teamId: string): Promise<News | null> {
    return cachePublicData(["news", "detail", teamId, String(id)], async () => {
      const repo = await this.repo();
      return repo.findOne({ where: { id, teamId, isPublished: true } });
    }, 60);
  }
}
