/**
 * TS-26 (avancement.md) : calendrier de retry durable, porté par
 * `NotificationOutboxEvent.attempts`/`nextRetryAt` — survit à un
 * redémarrage entre deux tentatives. Même calendrier que `payment-api`
 * (voir `outbox/retry-schedule.ts`, TS-13) pour rester cohérent entre les
 * deux implémentations de ce dépôt.
 */
export const RETRY_SCHEDULE_MINUTES = [1, 5, 15, 60, 360];

/**
 * `attemptsSoFar` est le nombre total de tentatives déjà effectuées (celle
 * qui vient d'échouer incluse). Renvoie la date de la prochaine tentative,
 * ou `null` une fois le calendrier épuisé — l'appelant doit alors marquer
 * l'événement FAILED plutôt que de reprogrammer indéfiniment.
 */
export function computeNextRetryAt(attemptsSoFar: number, now: Date = new Date()): Date | null {
  const delayMinutes = RETRY_SCHEDULE_MINUTES[attemptsSoFar - 1];
  if (delayMinutes === undefined) return null;
  return new Date(now.getTime() + delayMinutes * 60_000);
}
