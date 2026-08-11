import { getDataSource } from "@/lib/database";
import { ObBadge } from "@/entities/ObBadge";
import { ObMemberBadge } from "@/entities/ObMemberBadge";

export class BadgeService {
  async listCatalog(): Promise<ObBadge[]> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(ObBadge).find({ order: { sortOrder: "ASC" } });
  }

  async getEarnedBadgeIds(userId: string): Promise<Set<string>> {
    const dataSource = await getDataSource();
    const earned = await dataSource.getRepository(ObMemberBadge).find({ where: { userId } });
    return new Set(earned.map((e) => e.badgeId));
  }
}
