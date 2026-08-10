import bcrypt from "bcryptjs";
import { getDataSource } from "./db";
import { User } from "@/entities/User";
import type { SsoUser } from "./session";

export interface Credentials {
  email: string;
  password: string;
  /** Requis pour les comptes ADMIN/OBSERVATEUR (scopés par club), absent pour SUPERADMIN. */
  teamId?: string | null;
}

/**
 * Vérifie les identifiants contre la table `User` partagée. Règles reprises
 * de teamManager (src/lib/auth.ts) :
 * - un compte ADMIN/OBSERVATEUR n'est valide que pour SON club (teamId doit
 *   correspondre au club sélectionné à l'écran de connexion) ;
 * - SUPERADMIN n'a pas de club (teamId doit être absent).
 */
export async function authenticate(credentials: Credentials): Promise<SsoUser | null> {
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(User);

  const user = await repository.findOne({ where: { email: credentials.email } });
  if (!user || !user.isActive) return null;

  const valid = await bcrypt.compare(credentials.password, user.password);
  if (!valid) return null;

  if (user.role === "SUPERADMIN") {
    if (credentials.teamId) return null;
  } else {
    if (!user.teamId || user.teamId !== credentials.teamId) return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: user.teamId ?? null,
  };
}
