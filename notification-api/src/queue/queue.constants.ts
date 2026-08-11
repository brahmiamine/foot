export const QUEUE_NAMES = {
  EMAIL: 'notifications-email',
  PUSH: 'notifications-push',
  SMS: 'notifications-sms',
} as const;

export interface ChannelDispatchJobData {
  notificationId: string;
  deliveryId: string;
}

/**
 * Politique de retry commune (§18) : 5 tentatives, backoff exponentiel à
 * partir de 30s (30s, 60s, 120s, 240s), puis statut définitif FAILED. Un
 * canal particulièrement volatile (ex: SMS futur) pourra surcharger ces
 * valeurs à l'enregistrement de sa queue sans impacter les autres.
 */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 30_000 },
  removeOnComplete: { age: 60 * 60 * 24 * 7, count: 10_000 },
  removeOnFail: { age: 60 * 60 * 24 * 30 },
};
