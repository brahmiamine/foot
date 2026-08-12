import { registerAs } from '@nestjs/config';

/**
 * URL de webhook applicatif par application de l'écosystème, à appeler une
 * fois qu'un paiement passe PAID — voir PaymentWebhookListener. WEBHOOK_URLS
 * est un JSON `{ "application": "https://..." }` ; une application absente
 * de ce registre ne reçoit simplement aucun webhook (elle garde sa
 * réconciliation existante par polling, voir avancement.md, "Boucles
 * fermées post-paiement"). Même convention que service-clients.config.ts.
 */
export const webhookUrlsConfig = registerAs(
  'webhookUrls',
  (): Record<string, string> => {
    const raw = process.env.WEBHOOK_URLS;
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error('WEBHOOK_URLS must be a JSON object');
      }
      return parsed as Record<string, string>;
    } catch (error) {
      throw new Error(
        `Invalid WEBHOOK_URLS: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
);
