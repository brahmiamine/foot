import { getDataSource } from "@/lib/database";
import { News } from "@/entities/News";

export class PublicNewsService {
  private async repo() {
    const ds = await getDataSource();
    return ds.getRepository(News);
  }

  async getLatest(teamId: string, limit = 3): Promise<News[]> {
    const repo = await this.repo();
    return repo.find({
      where: { teamId, isPublished: true },
      order: { publishedAt: "DESC", createdAt: "DESC" },
      take: limit,
    });
  }

  async getAll(teamId: string): Promise<News[]> {
    const repo = await this.repo();
    return repo.find({
      where: { teamId, isPublished: true },
      order: { publishedAt: "DESC", createdAt: "DESC" },
    });
  }

  async getById(id: number, teamId: string): Promise<News | null> {
    const repo = await this.repo();
    return repo.findOne({ where: { id, teamId, isPublished: true } });
  }
}
