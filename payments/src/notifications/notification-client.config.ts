import { registerAs } from '@nestjs/config';

/**
 * Configuration optionnelle de l'intégration notifications (voir
 * NotificationClientService). Si NOTIFICATION_API_URL ou
 * NOTIFICATION_API_KEY est absent, l'intégration reste inactive : aucun
 * paiement confirmé n'échoue jamais faute de notifications configuré.
 */
export const notificationClientConfig = registerAs(
  'notificationClient',
  () => ({
    url: process.env.NOTIFICATION_API_URL,
    apiKey: process.env.NOTIFICATION_API_KEY,
  }),
);
