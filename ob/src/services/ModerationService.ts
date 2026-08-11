import { getDataSource } from "@/lib/database";
import { ObReport } from "@/entities/ObReport";
import { ObPost } from "@/entities/ObPost";
import { ObComment } from "@/entities/ObComment";
import { ObFanWallItem } from "@/entities/ObFanWallItem";
import { ObMember } from "@/entities/ObMember";
import { ObModerationLog } from "@/entities/ObModerationLog";
import { CommunityUser } from "@/entities/CommunityUser";

export interface ReportView {
  id: number;
  targetType: string;
  targetId: string;
  reporterName: string;
  reason: string | null;
  createdAt: Date;
  preview: string;
  authorUserId: string | null;
  authorName: string | null;
}

export interface ModerationLogView {
  id: number;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  createdAt: Date;
}

export class ModerationService {
  async listOpenReports(limit = 50): Promise<ReportView[]> {
    const dataSource = await getDataSource();
    const reports = await dataSource
      .getRepository(ObReport)
      .find({ where: { status: "OPEN" }, order: { createdAt: "DESC" }, take: limit });
    if (reports.length === 0) return [];

    const postIds = reports.filter((r) => r.targetType === "POST").map((r) => Number(r.targetId));
    const commentIds = reports.filter((r) => r.targetType === "COMMENT").map((r) => Number(r.targetId));

    const [posts, comments] = await Promise.all([
      postIds.length ? dataSource.getRepository(ObPost).find({ where: postIds.map((id) => ({ id })) }) : [],
      commentIds.length
        ? dataSource.getRepository(ObComment).find({ where: commentIds.map((id) => ({ id })) })
        : [],
    ]);
    const postById = new Map(posts.map((p) => [p.id, p]));
    const commentById = new Map(comments.map((c) => [c.id, c]));

    const authorIds = [
      ...posts.map((p) => p.userId),
      ...comments.map((c) => c.userId),
      ...reports.map((r) => r.reportedBy),
    ];
    const names = await this.userNames(authorIds);

    return reports.map((r) => {
      const post = r.targetType === "POST" ? postById.get(Number(r.targetId)) : undefined;
      const comment = r.targetType === "COMMENT" ? commentById.get(Number(r.targetId)) : undefined;
      const authorUserId = post?.userId ?? comment?.userId ?? null;
      return {
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reporterName: names.get(r.reportedBy) ?? "Supporter",
        reason: r.reason ?? null,
        createdAt: r.createdAt,
        preview: post?.body ?? comment?.body ?? "(élément de la tribune)",
        authorUserId,
        authorName: authorUserId ? (names.get(authorUserId) ?? "Supporter") : null,
      };
    });
  }

  async listPendingFanWall() {
    const dataSource = await getDataSource();
    const items = await dataSource
      .getRepository(ObFanWallItem)
      .find({ where: { status: "PENDING" }, order: { createdAt: "ASC" } });
    const names = await this.userNames(items.map((i) => i.userId));
    return items.map((item) => ({ ...item, authorName: names.get(item.userId) ?? "Supporter" }));
  }

  async listBlockedUsers() {
    const dataSource = await getDataSource();
    const members = await dataSource.getRepository(ObMember).find({ where: { isBlocked: true } });
    const names = await this.userNames(members.map((m) => m.userId));
    return members.map((m) => ({ userId: m.userId, name: names.get(m.userId) ?? "Supporter" }));
  }

  async listHistory(limit = 50): Promise<ModerationLogView[]> {
    const dataSource = await getDataSource();
    const logs = await dataSource
      .getRepository(ObModerationLog)
      .find({ order: { createdAt: "DESC" }, take: limit });
    const names = await this.userNames(logs.map((l) => l.actorUserId));
    return logs.map((l) => ({
      id: l.id,
      actorName: names.get(l.actorUserId) ?? "Staff",
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      reason: l.reason ?? null,
      createdAt: l.createdAt,
    }));
  }

  private async userNames(userIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = Array.from(new Set(userIds));
    if (uniqueIds.length === 0) return new Map();
    const dataSource = await getDataSource();
    const users = await dataSource.getRepository(CommunityUser).find({ where: uniqueIds.map((id) => ({ id })) });
    return new Map(users.map((u) => [u.id, u.name]));
  }
}
