import { getDataSource } from "@/lib/database";
import { ObPost } from "@/entities/ObPost";
import { ObComment, type ObCommentTargetType } from "@/entities/ObComment";
import { ObReaction, REACTION_EMOJIS, type ObReactionTargetType } from "@/entities/ObReaction";
import { CommunityUser } from "@/entities/CommunityUser";

export interface ReactionSummary {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface PostView {
  id: number;
  authorName: string;
  body: string;
  imageUrl: string | null;
  createdAt: Date;
  reactions: ReactionSummary[];
  commentCount: number;
}

export interface CommentView {
  id: number;
  authorName: string;
  body: string;
  createdAt: Date;
}

export class CommunityFeedService {
  async listPosts(userId: string | null, limit = 30): Promise<PostView[]> {
    const dataSource = await getDataSource();
    const posts = await dataSource
      .getRepository(ObPost)
      .find({ where: { status: "PUBLISHED" }, order: { createdAt: "DESC" }, take: limit });

    if (posts.length === 0) return [];

    const postIds = posts.map((p) => String(p.id));
    const [reactions, commentCounts, authors] = await Promise.all([
      this.reactionSummaries("POST", postIds, userId),
      this.commentCounts("POST", postIds),
      this.authorNames(posts.map((p) => p.userId)),
    ]);

    return posts.map((post) => ({
      id: post.id,
      authorName: authors.get(post.userId) ?? "Supporter",
      body: post.body,
      imageUrl: post.imageUrl ?? null,
      createdAt: post.createdAt,
      reactions: reactions.get(String(post.id)) ?? REACTION_EMOJIS.map((emoji) => ({ emoji, count: 0, mine: false })),
      commentCount: commentCounts.get(String(post.id)) ?? 0,
    }));
  }

  async listComments(targetType: ObCommentTargetType, targetId: string): Promise<CommentView[]> {
    const dataSource = await getDataSource();
    const comments = await dataSource
      .getRepository(ObComment)
      .find({ where: { targetType, targetId, status: "PUBLISHED" }, order: { createdAt: "ASC" } });

    const authors = await this.authorNames(comments.map((c) => c.userId));
    return comments.map((c) => ({
      id: c.id,
      authorName: authors.get(c.userId) ?? "Supporter",
      body: c.body,
      createdAt: c.createdAt,
    }));
  }

  async reactionSummaries(
    targetType: ObReactionTargetType,
    targetIds: string[],
    userId: string | null
  ): Promise<Map<string, ReactionSummary[]>> {
    if (targetIds.length === 0) return new Map();
    const dataSource = await getDataSource();
    const rows = await dataSource
      .getRepository(ObReaction)
      .createQueryBuilder("r")
      .select("r.target_id", "targetId")
      .addSelect("r.emoji", "emoji")
      .addSelect("COUNT(*)", "count")
      .addSelect(
        userId ? "SUM(CASE WHEN r.user_id = :userId THEN 1 ELSE 0 END)" : "0",
        "mine"
      )
      .where("r.target_type = :targetType", { targetType })
      .andWhere("r.target_id IN (:...targetIds)", { targetIds })
      .setParameter("userId", userId ?? "")
      .groupBy("r.target_id")
      .addGroupBy("r.emoji")
      .getRawMany<{ targetId: string; emoji: string; count: string; mine: string }>();

    const map = new Map<string, ReactionSummary[]>();
    for (const targetId of targetIds) {
      map.set(
        targetId,
        REACTION_EMOJIS.map((emoji) => ({ emoji, count: 0, mine: false }))
      );
    }
    for (const row of rows) {
      const list = map.get(row.targetId);
      if (!list) continue;
      const entry = list.find((r) => r.emoji === row.emoji);
      if (entry) {
        entry.count = Number(row.count);
        entry.mine = Number(row.mine) > 0;
      }
    }
    return map;
  }

  async commentCounts(targetType: ObCommentTargetType, targetIds: string[]): Promise<Map<string, number>> {
    if (targetIds.length === 0) return new Map();
    const dataSource = await getDataSource();
    const rows = await dataSource
      .getRepository(ObComment)
      .createQueryBuilder("c")
      .select("c.target_id", "targetId")
      .addSelect("COUNT(*)", "count")
      .where("c.target_type = :targetType", { targetType })
      .andWhere("c.target_id IN (:...targetIds)", { targetIds })
      .andWhere("c.status = 'PUBLISHED'")
      .groupBy("c.target_id")
      .getRawMany<{ targetId: string; count: string }>();

    return new Map(rows.map((r) => [r.targetId, Number(r.count)]));
  }

  private async authorNames(userIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = Array.from(new Set(userIds));
    if (uniqueIds.length === 0) return new Map();
    const dataSource = await getDataSource();
    const users = await dataSource.getRepository(CommunityUser).find({
      where: uniqueIds.map((id) => ({ id })),
    });
    return new Map(users.map((u) => [u.id, u.name]));
  }
}
