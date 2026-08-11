import { getDataSource } from "@/lib/database";
import { ObFollow } from "@/entities/ObFollow";

export class FollowService {
  async getFollowedIds(userId: string, targetType: "TEAM" | "PLAYER"): Promise<Set<string>> {
    const dataSource = await getDataSource();
    const follows = await dataSource.getRepository(ObFollow).find({ where: { userId, targetType } });
    return new Set(follows.map((f) => f.targetId));
  }
}
