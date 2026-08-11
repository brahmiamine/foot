import { getDataSource } from "@/lib/database";
import { ObFanWallItem } from "@/entities/ObFanWallItem";
import { CommunityUser } from "@/entities/CommunityUser";

export interface FanWallItemView {
  id: number;
  authorName: string;
  message: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  createdAt: Date;
}

export class FanWallService {
  async listPublished(limit = 30): Promise<FanWallItemView[]> {
    const dataSource = await getDataSource();
    const items = await dataSource
      .getRepository(ObFanWallItem)
      .find({ where: { status: "PUBLISHED" }, order: { createdAt: "DESC" }, take: limit });
    if (items.length === 0) return [];

    const users = await dataSource
      .getRepository(CommunityUser)
      .find({ where: Array.from(new Set(items.map((i) => i.userId))).map((id) => ({ id })) });
    const names = new Map(users.map((u) => [u.id, u.name]));

    return items.map((item) => ({
      id: item.id,
      authorName: names.get(item.userId) ?? "Supporter",
      message: item.message ?? null,
      imageUrl: item.imageUrl ?? null,
      videoUrl: item.videoUrl ?? null,
      createdAt: item.createdAt,
    }));
  }
}
