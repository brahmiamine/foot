import { getDataSource } from "./db";
import { SecurityEvent, type SecurityEventType } from "@/entities/SecurityEvent";

export type { SecurityEventType };

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

export interface RecentSecurityEvent {
  type: SecurityEventType;
  ip: string | null;
  createdAt: Date;
}

/**
 * Activité récente d'un compte, pour l'afficher sur le portail (`/`) —
 * matché sur `userId` (événements liés à une session déjà identifiée,
 * MFA/reset/déconnexion) ET sur `email` (les tentatives de connexion
 * échouées ne résolvent jamais de `userId`, seul l'email saisi est connu).
 */
export async function listRecentSecurityEvents(
  userId: string,
  email: string,
  limit = 10,
): Promise<RecentSecurityEvent[]> {
  const dataSource = await getDataSource();
  const events = await dataSource
    .getRepository(SecurityEvent)
    .createQueryBuilder("event")
    .where("event.user_id = :userId", { userId })
    .orWhere("event.email = :email", { email })
    .orderBy("event.created_at", "DESC")
    .limit(limit)
    .getMany();

  return events.map((event) => ({ type: event.type, ip: event.ip ?? null, createdAt: event.createdAt }));
}

export interface SecurityEventRow {
  id: string;
  type: SecurityEventType;
  email: string | null;
  userId: string | null;
  ip: string | null;
  createdAt: Date;
}

export interface SecurityEventFilters {
  type?: SecurityEventType;
  email?: string;
  limit?: number;
  offset?: number;
}

/**
 * Alimente le viewer admin (/security-events, réservé SUPERADMIN) : jusqu'ici
 * `security_events` n'était interrogeable qu'en SQL direct (voir
 * avancement.md). Filtrage par type et email (préfixe), pagination.
 */
export async function listSecurityEventsForAdmin(
  filters: SecurityEventFilters = {},
): Promise<{ events: SecurityEventRow[]; total: number }> {
  const limit = Math.min(100, Math.max(1, filters.limit ?? 25));
  const offset = Math.max(0, filters.offset ?? 0);

  const dataSource = await getDataSource();
  const qb = dataSource
    .getRepository(SecurityEvent)
    .createQueryBuilder("event")
    .orderBy("event.created_at", "DESC");

  if (filters.type) qb.andWhere("event.type = :type", { type: filters.type });
  if (filters.email) qb.andWhere("event.email LIKE :email", { email: `%${filters.email}%` });

  const [events, total] = await qb.take(limit).skip(offset).getManyAndCount();

  return {
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      email: event.email ?? null,
      userId: event.userId ?? null,
      ip: event.ip ?? null,
      createdAt: event.createdAt,
    })),
    total,
  };
}
