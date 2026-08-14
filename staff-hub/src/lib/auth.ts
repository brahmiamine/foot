import { getSsoSession } from "./ssoSession";

export interface StaffSessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: string;
}

/**
 * Même règle métier que club-hub/src/lib/auth.ts : SUPERADMIN (sans club),
 * MEMBER (espace membre) et PLAYER (espace joueur, voir player-hub) n'ont
 * pas leur place ici, ce sont des populations différentes avec leur propre
 * app. Un compte ADMIN ou OBSERVATEUR avec un teamId est un membre du
 * staff club — ses permissions précises sont résolues séparément par
 * lib/access.ts (RBAC cms_roles/cms_user_roles, déjà en place côté
 * club-hub, réutilisé tel quel ici).
 */
export async function auth(): Promise<{ user: StaffSessionUser } | null> {
  const session = await getSsoSession();
  if (
    !session ||
    session.role === "SUPERADMIN" ||
    session.role === "PLATFORM_SUPERADMIN" ||
    session.role === "MEMBER" ||
    session.role === "PLAYER" ||
    !session.teamId
  ) {
    return null;
  }

  return {
    user: {
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role,
      teamId: session.teamId,
    },
  };
}
