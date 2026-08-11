import { getDataSource } from "./db";
import { SecurityLog, type SecurityEventType } from "@/entities/SecurityLog";

interface LogSecurityEventParams {
  eventType: SecurityEventType;
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  detail?: string | null;
}

/**
 * Enregistre un événement de sécurité (login échoué, rate limit, jeton
 * invalide, mot de passe oublié, MFA, révocation de session — voir
 * SecurityLog). Ne doit jamais faire échouer l'action appelante : toute
 * erreur est avalée et journalisée côté serveur uniquement (même logique que
 * `arbinote/src/lib/auditLog.ts`).
 */
export async function logSecurityEvent({
  eventType,
  userId,
  email,
  ip,
  detail,
}: LogSecurityEventParams): Promise<void> {
  try {
    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(SecurityLog);
    const entry = repo.create({
      eventType,
      userId: userId ?? null,
      email: email ?? null,
      ip: ip && ip !== "unknown" ? ip : null,
      detail: detail ?? null,
    });
    await repo.save(entry);
  } catch (error) {
    console.error("Failed to write security log entry:", error);
  }
}
