import bcrypt from "bcryptjs";
import { getDataSource } from "./db";
import { User } from "@/entities/User";
import { isAccountAccessAllowed } from "./accountAccess";
import type { SsoUser } from "./session";

export interface Credentials {
  email: string;
  password: string;
  /** Requis pour les comptes ADMIN/OBSERVATEUR (scopés par club), absent pour SUPERADMIN. */
  teamId?: string | null;
}

/**
 * Vérifie les identifiants contre la table `User` partagée. Règles reprises
 * de club-hub (src/lib/auth.ts) :
 * - un compte ADMIN/OBSERVATEUR/PLAYER n'est valide que pour SON club (teamId
 *   doit correspondre au club sélectionné à l'écran de connexion) ;
 * - SUPERADMIN n'a pas de club (teamId doit être absent) ;
 * - MEMBER (espace membre public de `ob`) n'est pas scopé par club non plus ;
 * - la fenêtre d'accès temporaire [validFrom, validUntil) est vérifiée côté
 *   serveur avant toute émission de session.
 */
export async function authenticate(credentials: Credentials): Promise<SsoUser | null> {
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(User);

  const user = await repository.findOne({ where: { email: credentials.email } });
  if (!user || !isAccountAccessAllowed(user)) return null;

  const valid = await bcrypt.compare(credentials.password, user.password);
  if (!valid) return null;

  const isClubScopedAccount = user.role === "ADMIN" || user.role === "OBSERVATEUR" || user.role === "PLAYER";
  if (isClubScopedAccount) {
    if (!user.teamId || user.teamId !== credentials.teamId) return null;
  } else {
    // Les comptes fédéraux et les officiels (REFEREE/MATCH_OFFICIAL/
    // REFEREE_OBSERVER) sont personnels et non rattachés à un club. Leur
    // imposer un teamId rendrait leur connexion Identity impossible.
    if (credentials.teamId || user.teamId) return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: user.teamId ?? null,
    playerId: user.playerId ?? null,
    tokenVersion: user.tokenVersion,
  };
}