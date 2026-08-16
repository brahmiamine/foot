import { headers } from "next/headers";
import type { ActorRole } from "@/entities/Signature";
import {
  MatchAccessDeniedError,
  MatchAccessService,
  type MatchActorSession,
} from "@/services/MatchAccessService";

export async function getCurrentMatchActorSession(): Promise<MatchActorSession> {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("x-sso-user-id");
  const role = requestHeaders.get("x-sso-role");
  const teamId = requestHeaders.get("x-sso-team-id");

  if (!userId || !role) {
    throw new MatchAccessDeniedError("Session SSO requise");
  }

  return { userId, role, teamId };
}

export async function assertCurrentMatchAccess(matchId: string): Promise<MatchActorSession> {
  const session = await getCurrentMatchActorSession();
  await new MatchAccessService().assertMatchAccess(session, matchId);
  return session;
}

export async function assertCurrentSignatureActor(
  matchId: string,
  actorRole: ActorRole,
): Promise<MatchActorSession> {
  const session = await getCurrentMatchActorSession();
  await new MatchAccessService().assertSignatureActor(session, matchId, actorRole);
  return session;
}
