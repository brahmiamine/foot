import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import type { CommunityReaction } from "@/lib/communityRules";

export interface NewsCommunityEngagement {
  counts: Record<CommunityReaction, number>;
  userReaction: CommunityReaction | null;
  comments: Array<{ id: string; authorName: string; body: string; createdAt: string }>;
}

function iso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

export class SupporterNewsCommunityService {
  private async assertNews(teamId: string, newsId: string): Promise<void> {
    const numericId = Number(newsId);
    if (!Number.isInteger(numericId) || numericId <= 0) throw new Error("INVALID_TARGET");
    const db = await getDataSource();
    const rows = await db.query(
      `SELECT id FROM cms_news WHERE id = ? AND team_id = ? AND is_published = 1 LIMIT 1`,
      [numericId, teamId],
    ) as Array<{ id: number }>;
    if (!rows[0]) throw new Error("INVALID_TARGET");
  }

  async setReaction(input: {
    userId: string;
    teamId: string;
    targetId: string;
    reaction: CommunityReaction;
  }): Promise<void> {
    await this.assertNews(input.teamId, input.targetId);
    const db = await getDataSource();
    await db.query(
      `INSERT INTO cms_supporter_reactions (id, team_id, user_id, target_type, target_id, reaction)
       VALUES (?, ?, ?, 'NEWS', ?, ?)
       ON DUPLICATE KEY UPDATE reaction = VALUES(reaction), updated_at = NOW()`,
      [randomUUID(), input.teamId, input.userId, input.targetId, input.reaction],
    );
  }

  async submitComment(input: {
    userId: string;
    teamId: string;
    memberName: string;
    targetId: string;
    body: string;
  }): Promise<void> {
    await this.assertNews(input.teamId, input.targetId);
    const db = await getDataSource();
    const recent = await db.query(
      `SELECT COUNT(*) AS total FROM cms_supporter_comments
       WHERE team_id = ? AND user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
      [input.teamId, input.userId],
    ) as Array<{ total: number | string }>;
    if (Number(recent[0]?.total ?? 0) >= 5) throw new Error("RATE_LIMITED");
    await db.query(
      `INSERT INTO cms_supporter_comments
        (id, team_id, user_id, author_name, target_type, target_id, body, status)
       VALUES (?, ?, ?, ?, 'NEWS', ?, ?, 'PENDING')`,
      [randomUUID(), input.teamId, input.userId, input.memberName.slice(0, 120), input.targetId, input.body],
    );
  }

  async getEngagement(teamId: string, newsId: string, userId?: string | null): Promise<NewsCommunityEngagement> {
    await this.assertNews(teamId, newsId);
    const db = await getDataSource();
    const reactionRows = await db.query(
      `SELECT reaction, COUNT(*) AS total FROM cms_supporter_reactions
       WHERE team_id = ? AND target_type = 'NEWS' AND target_id = ? GROUP BY reaction`,
      [teamId, newsId],
    ) as Array<{ reaction: CommunityReaction; total: number | string }>;
    const comments = await db.query(
      `SELECT id, COALESCE(NULLIF(author_name, ''), 'Supporter OB') AS authorName, body, created_at AS createdAt
       FROM cms_supporter_comments
       WHERE team_id = ? AND target_type = 'NEWS' AND target_id = ? AND status = 'APPROVED'
       ORDER BY created_at DESC LIMIT 50`,
      [teamId, newsId],
    ) as Array<{ id: string; authorName: string; body: string; createdAt: Date }>;

    const counts: Record<CommunityReaction, number> = { LIKE: 0, FIRE: 0, BRAVO: 0, SAD: 0 };
    for (const row of reactionRows) counts[row.reaction] = Number(row.total);

    let userReaction: CommunityReaction | null = null;
    if (userId) {
      const rows = await db.query(
        `SELECT reaction FROM cms_supporter_reactions
         WHERE team_id = ? AND user_id = ? AND target_type = 'NEWS' AND target_id = ? LIMIT 1`,
        [teamId, userId, newsId],
      ) as Array<{ reaction: CommunityReaction }>;
      userReaction = rows[0]?.reaction ?? null;
    }

    return {
      counts,
      userReaction,
      comments: comments.map((comment) => ({ ...comment, createdAt: iso(comment.createdAt) })),
    };
  }
}
