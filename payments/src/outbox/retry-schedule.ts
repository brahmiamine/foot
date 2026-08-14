/**
 * TS-13 (avancement.md) : remplace les 2 retries courts en mémoire
 * (l'ancien WebhookDispatchService retentait 2 fois sur ~2 secondes puis
 * abandonnait définitivement) par un calendrier durable, porté par
 * OutboxEvent.attempts/nextRetryAt plutôt que par une boucle en mémoire —
 * survit à un redémarrage du process entre deux tentatives.
 */
export const RETRY_SCHEDULE_MINUTES = [1, 5, 15, 60, 360];

/**
 * `attemptsSoFar` est le nombre total de tentatives déjà effectuées (celle
 * qui vient d'échouer incluse). Renvoie la date de la prochaine tentative,
 * ou `null` une fois le calendrier épuisé — l'appelant doit alors marquer
 * l'événement FAILED (DLQ, voir OutboxWorkerService) plutôt que de
 * reprogrammer indéfiniment.
 */
export function computeNextRetryAt(
  attemptsSoFar: number,
  now: Date = new Date(),
): Date | null {
  const delayMinutes = RETRY_SCHEDULE_MINUTES[attemptsSoFar - 1];
  if (delayMinutes === undefined) return null;
  return new Date(now.getTime() + delayMinutes * 60_000);
}
