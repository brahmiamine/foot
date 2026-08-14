import { auth } from "./auth";

/**
 * Un seul déploiement de club-hub sert tous les clubs : chaque page/action
 * doit scoper ses requêtes au club de l'utilisateur connecté (session.user.teamId),
 * jamais à une valeur fixe. Le layout `/admin` garantit déjà qu'une session
 * valide existe avant d'atteindre une page enfant.
 */
export async function requireTeamId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.teamId) {
    throw new Error("Non authentifié");
  }
  return session.user.teamId;
}
