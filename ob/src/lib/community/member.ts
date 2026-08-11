import { getDataSource } from "@/lib/database";
import { getSsoSession, type SsoUser } from "@/lib/ssoSession";
import { ObMember } from "@/entities/ObMember";
import { awardPoints } from "@/lib/community/points";
import { maybeAwardHistoricFanBadge } from "@/lib/community/badges";

export interface SessionMember {
  session: SsoUser;
  member: ObMember;
}

/**
 * Crée la ligne `ob_members` au premier contact d'un compte SSO avec une
 * fonctionnalité communauté (post, vote, pronostic...), plutôt qu'à
 * l'inscription : évite de coupler `sso` (qui ne connaît rien de `ob`) au
 * profil communauté.
 */
export async function getOrCreateMember(userId: string): Promise<ObMember> {
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(ObMember);

  const existing = await repository.findOne({ where: { userId } });
  if (existing) return existing;

  const member = repository.create({ userId, points: 0, isBlocked: false });
  try {
    await repository.save(member);
  } catch {
    // Course entre deux requêtes concurrentes sur le même compte : la ligne
    // existe déjà, on la relit.
    const raced = await repository.findOne({ where: { userId } });
    if (raced) return raced;
    throw new Error(`Failed to create ob_members row for ${userId}`);
  }

  await awardPoints(userId, 100, "SIGNUP");
  await maybeAwardHistoricFanBadge(userId);
  member.points = 100;
  return member;
}

/** Session + profil communauté, ou `null` si non connecté. */
export async function getSessionMember(): Promise<SessionMember | null> {
  const session = await getSsoSession();
  if (!session) return null;
  const member = await getOrCreateMember(session.id);
  return { session, member };
}
