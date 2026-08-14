import { getSsoSession } from "./ssoSession";
import type { SessionUser } from "@/types/auth";

/**
 * Remplace l'ancien NextAuth (Credentials + JWT local) par une lecture du
 * cookie de session partagé émis par l'app `sso`. Signature inchangée
 * (`await auth()` retourne `{ user } | null`) pour ne pas toucher aux ~30
 * fichiers qui l'appellent déjà (les actions.ts sous admin/, admin/layout.tsx,
 * app/page.tsx, exports...).
 *
 * Règle métier conservée : SUPERADMIN (sans club) n'a jamais accès à
 * club-hub — un compte sans teamId ne produit pas de session ici.
 * MEMBER (ajouté pour /boutique, voir ssoSession.ts) n'a pas non plus sa
 * place ici : ce sont des clients, jamais du staff back-office — /boutique
 * fait sa propre vérification de rôle (getSsoSession() directement), sans
 * passer par auth()/requireTeamId(). Même exclusion pour PLAYER (voir
 * player-hub) : un joueur n'a par construction aucune ligne cms_user_roles
 * ici, mais reste explicitement exclu plutôt que de dépendre de ça.
 */
export async function auth(): Promise<{ user: SessionUser } | null> {
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
