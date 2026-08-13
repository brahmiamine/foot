/**
 * Détecte une violation de contrainte unique (clé dupliquée) — MySQL/MariaDB
 * en production (`ER_DUP_ENTRY`), better-sqlite3 en test (`SQLITE_CONSTRAINT*`).
 * Utilisé pour les inserts idempotents (INSERT puis catch-doublon plutôt
 * qu'un SELECT préalable, évite une fenêtre de course) — voir
 * SheetService.reopen (idempotencyKey) et GoalService/SubstitutionService/
 * InjuryService.create (clientRequestId).
 */
export function isDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const record = error as Record<string, unknown>;
  const code =
    typeof record.code === "string"
      ? record.code
      : typeof (record.driverError as Record<string, unknown> | undefined)?.code === "string"
        ? ((record.driverError as Record<string, unknown>).code as string)
        : undefined;
  return code === "ER_DUP_ENTRY" || (code?.startsWith("SQLITE_CONSTRAINT") ?? false);
}
