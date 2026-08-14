import { getDataSource } from "@/lib/database";
import { ProcessedWebhookEvent } from "@/entities/ProcessedWebhookEvent";

function isDuplicateKeyCode(code: unknown): boolean {
  // MySQL/MariaDB : ER_DUP_ENTRY. better-sqlite3 (tests, voir
  // src/test/testDataSource.ts) : SQLITE_CONSTRAINT_PRIMARYKEY ou
  // SQLITE_CONSTRAINT_UNIQUE selon la contrainte violée.
  return typeof code === "string" && (code === "ER_DUP_ENTRY" || code.startsWith("SQLITE_CONSTRAINT"));
}

function isDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const record = error as Record<string, unknown>;
  if (isDuplicateKeyCode(record.code)) return true;
  const driverError =
    typeof record.driverError === "object" && record.driverError !== null
      ? (record.driverError as Record<string, unknown>)
      : undefined;
  return isDuplicateKeyCode(driverError?.code);
}

/**
 * TASK-P0-005 : tente d'enregistrer `eventId` comme traité — la clé primaire
 * sur `event_id` fait office de verrou : un seul appel concurrent (même en
 * cas de course entre deux retries reçus quasi simultanément) réussit son
 * INSERT et doit traiter l'événement métier ; les autres échouent sur la
 * contrainte d'unicité et savent qu'ils peuvent l'ignorer. Retourne `true`
 * seulement pour le tout premier appel avec cet eventId. Même pattern que
 * ticketing/src/lib/webhookIdempotency.ts.
 */
export async function claimWebhookEvent(eventId: string, paymentId: string): Promise<boolean> {
  const ds = await getDataSource();
  const repo = ds.getRepository(ProcessedWebhookEvent);
  try {
    await repo.insert({ eventId, paymentId });
    return true;
  } catch (error) {
    if (isDuplicateKeyError(error)) return false;
    throw error;
  }
}
