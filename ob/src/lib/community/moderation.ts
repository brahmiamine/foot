import { getDataSource } from "@/lib/database";
import { ObPost } from "@/entities/ObPost";
import { ObComment } from "@/entities/ObComment";
import { ObMember } from "@/entities/ObMember";
import { ObFanWallItem } from "@/entities/ObFanWallItem";
import { ObReport } from "@/entities/ObReport";
import { ObModerationLog, type ObModerationAction } from "@/entities/ObModerationLog";

async function log(actorUserId: string, action: ObModerationAction, targetType: string, targetId: string, reason?: string | null): Promise<void> {
  const dataSource = await getDataSource();
  await dataSource.getRepository(ObModerationLog).save(
    dataSource.getRepository(ObModerationLog).create({
      actorUserId,
      action,
      targetType,
      targetId,
      reason: reason ?? null,
    })
  );
}

export async function hidePost(actorUserId: string, postId: number, reason?: string): Promise<boolean> {
  const dataSource = await getDataSource();
  const result = await dataSource.getRepository(ObPost).update({ id: postId }, { status: "HIDDEN" });
  if (!result.affected) return false;
  await log(actorUserId, "HIDE_POST", "POST", String(postId), reason);
  return true;
}

export async function hideComment(actorUserId: string, commentId: number, reason?: string): Promise<boolean> {
  const dataSource = await getDataSource();
  const result = await dataSource.getRepository(ObComment).update({ id: commentId }, { status: "HIDDEN" });
  if (!result.affected) return false;
  await log(actorUserId, "HIDE_COMMENT", "COMMENT", String(commentId), reason);
  return true;
}

export async function setUserBlocked(actorUserId: string, targetUserId: string, blocked: boolean, reason?: string): Promise<boolean> {
  const dataSource = await getDataSource();
  const result = await dataSource.getRepository(ObMember).update({ userId: targetUserId }, { isBlocked: blocked });
  if (!result.affected) return false;
  await log(actorUserId, blocked ? "BLOCK_USER" : "UNBLOCK_USER", "USER", targetUserId, reason);
  return true;
}

export async function reviewFanWallItem(actorUserId: string, itemId: number, approve: boolean, reason?: string): Promise<boolean> {
  const dataSource = await getDataSource();
  const result = await dataSource.getRepository(ObFanWallItem).update(
    { id: itemId },
    { status: approve ? "PUBLISHED" : "REJECTED", reviewedBy: actorUserId, reviewedAt: new Date() }
  );
  if (!result.affected) return false;
  await log(actorUserId, approve ? "APPROVE_FAN_WALL" : "REJECT_FAN_WALL", "FAN_WALL_ITEM", String(itemId), reason);
  return true;
}

export async function resolveReport(actorUserId: string, reportId: number, resolved: boolean, reason?: string): Promise<boolean> {
  const dataSource = await getDataSource();
  const result = await dataSource.getRepository(ObReport).update(
    { id: reportId },
    { status: resolved ? "RESOLVED" : "DISMISSED", resolvedBy: actorUserId, resolvedAt: new Date() }
  );
  if (!result.affected) return false;
  await log(actorUserId, resolved ? "RESOLVE_REPORT" : "DISMISS_REPORT", "REPORT", String(reportId), reason);
  return true;
}
