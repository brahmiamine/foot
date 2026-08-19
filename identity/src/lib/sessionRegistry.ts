import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { getDataSource } from "./db";
import { UserSession } from "@/entities/UserSession";
import { getClientIP } from "./getClientIP";

export interface SessionRequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface SessionSummary {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  current: boolean;
}

export function sessionContextFromRequest(request: NextRequest): SessionRequestContext {
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent")?.trim() || null;
  return {
    ipAddress: ip && ip !== "unknown" ? ip.slice(0, 45) : null,
    userAgent: userAgent ? userAgent.slice(0, 512) : null,
  };
}

export async function createOrRefreshSession(input: {
  userId: string;
  tokenVersion: number;
  sessionId?: string | null;
  ttlSeconds: number;
  context?: SessionRequestContext;
}): Promise<string> {
  const dataSource = await getDataSource();
  const repo = dataSource.getRepository(UserSession);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.ttlSeconds * 1000);

  if (input.sessionId) {
    const existing = await repo.findOne({ where: { id: input.sessionId, userId: input.userId } });
    if (existing && !existing.revokedAt && existing.expiresAt.getTime() > now.getTime()) {
      existing.tokenVersion = input.tokenVersion;
      existing.lastSeenAt = now;
      existing.expiresAt = expiresAt;
      if (input.context?.ipAddress !== undefined) existing.ipAddress = input.context.ipAddress;
      if (input.context?.userAgent !== undefined) existing.userAgent = input.context.userAgent;
      await repo.save(existing);
      return existing.id;
    }
  }

  const session = repo.create({
    id: randomUUID(),
    userId: input.userId,
    tokenVersion: input.tokenVersion,
    ipAddress: input.context?.ipAddress ?? null,
    userAgent: input.context?.userAgent ?? null,
    lastSeenAt: now,
    expiresAt,
    revokedAt: null,
    revokedReason: null,
  });
  await repo.save(session);
  return session.id;
}

export async function validateRegisteredSession(input: {
  sessionId: string;
  userId: string;
  tokenVersion: number;
}): Promise<boolean> {
  const dataSource = await getDataSource();
  const repo = dataSource.getRepository(UserSession);
  const session = await repo.findOne({ where: { id: input.sessionId, userId: input.userId } });
  if (!session || session.revokedAt || session.tokenVersion !== input.tokenVersion) return false;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) return false;

  if (now - session.lastSeenAt.getTime() >= 5 * 60 * 1000) {
    session.lastSeenAt = new Date(now);
    await repo.save(session);
  }
  return true;
}

export async function listUserSessions(
  userId: string,
  currentSessionId?: string | null,
): Promise<SessionSummary[]> {
  const dataSource = await getDataSource();
  const repo = dataSource.getRepository(UserSession);
  const now = new Date();
  const sessions = await repo
    .createQueryBuilder("session")
    .where("session.user_id = :userId", { userId })
    .andWhere("session.revoked_at IS NULL")
    .andWhere("session.expires_at > :now", { now })
    .orderBy("session.last_seen_at", "DESC")
    .getMany();

  return sessions.map((session) => ({
    id: session.id,
    ipAddress: session.ipAddress ?? null,
    userAgent: session.userAgent ?? null,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    current: session.id === currentSessionId,
  }));
}

export async function revokeUserSession(
  userId: string,
  sessionId: string,
  reason = "USER_REVOKED",
): Promise<boolean> {
  const dataSource = await getDataSource();
  const repo = dataSource.getRepository(UserSession);
  const session = await repo.findOne({ where: { id: sessionId, userId } });
  if (!session || session.revokedAt) return false;
  session.revokedAt = new Date();
  session.revokedReason = reason;
  await repo.save(session);
  return true;
}

export async function revokeAllUserSessions(
  userId: string,
  reason = "LOGOUT_EVERYWHERE",
): Promise<number> {
  const dataSource = await getDataSource();
  const result = await dataSource
    .createQueryBuilder()
    .update(UserSession)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where("user_id = :userId", { userId })
    .andWhere("revoked_at IS NULL")
    .execute();
  return result.affected ?? 0;
}
