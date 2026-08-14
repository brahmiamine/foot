import { getSsoSession } from "./ssoSession";

export interface PlayerSessionUser {
  id: string;
  name: string;
  email: string;
  teamId: string;
  playerId: string;
}

/**
 * Garde-fou métier : seul un compte role "PLAYER" avec un teamId ET un
 * playerId produit une session ici (voir identity/src/entities/User.ts).
 * Un compte staff/membre/superadmin valide côté SSO mais sans ces deux
 * scopes n'a tout simplement pas de session player-hub — même principe que
 * club-hub/src/lib/auth.ts pour les rôles staff.
 */
export async function auth(): Promise<{ user: PlayerSessionUser } | null> {
  const session = await getSsoSession();
  if (!session || session.role !== "PLAYER" || !session.teamId || !session.playerId) {
    return null;
  }

  return {
    user: {
      id: session.id,
      name: session.name,
      email: session.email,
      teamId: session.teamId,
      playerId: session.playerId,
    },
  };
}
