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
    const updates = {
      tokenVersion: input.tokenVersion,
      lastSeenAt: now,
      expiresAt,
      ...(input.context?.ipAddress !== undefined ? { ipAddress: input.context.ipAddress } : {}),
      ...(input.context?.userAgent !== undefined ? { userAgent: input.context.userAgent } : {}),
    };
    const refreshed = await dataSource
      .createQueryBuilder()
      .update(UserSession)
      .set(updates)
      .where("id = :sessionId", { sessionId: input.sessionId })
      .andWhere("user_id = :userId", { userId: input.userId })
      .andWhere("token_version = :tokenVersion", { tokenVersion: input.tokenVersion })
      .andWhere("revoked_at IS NULL")
      .andWhere("expires_at > :now", { now })
      .execute();

    if ((refreshed.affected ?? 0) === 1) return input.sessionId;

    // Un sid fourni provient d'une session déjà authentifiée. S'il n'est
    // plus actif, créer silencieusement un nouveau sid contournerait une
    // révocation distante concurrente ; la réémission doit donc échouer.
    throw new Error("SESSION_NOT_ACTIVE");
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
    const touched = await dataSource
      .createQueryBuilder()
      .update(UserSession)
      .set({ lastSeenAt: new Date(now) })
      .where("id = :sessionId", { sessionId: input.sessionId })
      .andWhere("user_id = :userId", { userId: input.userId })
      .andWhere("token_version = :tokenVersion", { tokenVersion: input.tokenVersion })
      .andWhere("revoked_at IS NULL")
      .andWhere("expires_at > :now", { now: new Date(now) })
      .execute();
    if ((touched.affected ?? 0) !== 1) return false;
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
  const result = await dataSource
    .createQueryBuilder()
    .update(UserSession)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where("id = :sessionId", { sessionId })
    .andWhere("user_id = :userId", { userId })
    .andWhere("revoked_at IS NULL")
    .execute();
  return (result.affected ?? 0) === 1;
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
