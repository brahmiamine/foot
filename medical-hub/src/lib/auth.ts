import { getSsoSession } from "./ssoSession";

export interface MedicalSessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: string;
}

/**
 * Même règle que staff-hub/src/lib/auth.ts et club-hub/src/lib/auth.ts :
 * SUPERADMIN (sans club), MEMBER et PLAYER n'ont pas leur place ici. Un
 * compte ADMIN ou OBSERVATEUR avec un teamId est un membre du staff club —
 * l'accès aux dossiers médicaux eux-mêmes est vérifié séparément par
 * lib/access.ts (permission "medical.view"/"medical.manage", RBAC
 * cms_roles/cms_user_roles déjà en place côté club-hub) : passer ce garde-
 * fou ne donne accès à rien de sensible tant que cette permission n'est pas
 * accordée.
 */
export async function auth(): Promise<{ user: MedicalSessionUser } | null> {
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
