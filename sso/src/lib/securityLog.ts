import { getDataSource } from "./db";
import { SecurityEvent, type SecurityEventType } from "@/entities/SecurityEvent";

/**
 * Journal de sécurité — échecs de connexion, rate limit, échecs MFA,
 * réinitialisation de mot de passe (voir avancement.md, § 3.B). Ne doit
 * jamais faire échouer le flux appelant : un problème d'écriture du journal
 * (base indisponible, etc.) ne doit pas empêcher une vraie connexion de
 * réussir, ni masquer la vraie erreur d'un échec de connexion. Écrit en
 * best-effort, jamais attendu de façon bloquante par le flux principal.
 */
export function logSecurityEvent(input: {
  type: SecurityEventType;
  email?: string | null;
  userId?: string | null;
  ip?: string | null;
}): void {
  getDataSource()
    .then((dataSource) =>
      dataSource.getRepository(SecurityEvent).insert({
        type: input.type,
        email: input.email ?? null,
        userId: input.userId ?? null,
        ip: input.ip && input.ip !== "unknown" ? input.ip : null,
      }),
    )
    .catch((error) => {
      console.error(`Failed to record security event "${input.type}":`, error);
    });
}
