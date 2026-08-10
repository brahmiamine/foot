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
}
