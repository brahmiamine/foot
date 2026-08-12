import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createHmac } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { webhookUrlsConfig } from './webhook-urls.config';

export interface WebhookPayload {
  eventId: string;
  paymentId: string;
  orderId: string;
  status: 'PAID';
  provider: string;
  providerRef: string;
  amount: string;
  currency: string;
  userId: string | null;
}

const RETRY_DELAYS_MS = [500, 1500];
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Best-effort delivery of a signed payment webhook to the calling
 * application — voir avancement.md, "Boucles fermées post-paiement" : ce
 * circuit n'existait pas, chaque app appelante devait deviner qu'un
 * paiement était confirmé (retour navigateur ou reconciliation
 * opportuniste). Ne remplace pas cette reconciliation existante : elle
 * reste le filet de sécurité si ce webhook n'arrive jamais (app
 * injoignable, non configurée dans WEBHOOK_URLS...).
 *
 * Signature HMAC-SHA256 du corps JSON brut avec PAYMENT_WEBHOOK_SECRET
 * (header `X-Payment-Signature: sha256=<hex>`), à vérifier côté receveur
 * avant de faire confiance au contenu — même esprit que Konnect/Paymee/
 * Flouci envers payment-api, dans l'autre sens. Quelques tentatives
 * rapprochées (pas de file d'attente durable) : jamais bloquant, jamais
 * jeté, la transition PAID elle-même est déjà actée avant l'appel.
 */
@Injectable()
export class WebhookDispatchService {
  private readonly logger = new Logger(WebhookDispatchService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(webhookUrlsConfig.KEY)
    private readonly urls: ConfigType<typeof webhookUrlsConfig>,
  ) {}

  async dispatch(
    callerApplication: string | null,
    payload: WebhookPayload,
  ): Promise<void> {
    if (!callerApplication) return;

    const url = this.urls[callerApplication];
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!url || !secret) return;

    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        await firstValueFrom(
          this.httpService.post(url, body, {
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
              'Content-Type': 'application/json',
              'X-Payment-Signature': `sha256=${signature}`,
            },
          }),
        );
        return;
      } catch (error) {
        const isLastAttempt = attempt === RETRY_DELAYS_MS.length;
        this.logger.warn(
          `Webhook delivery to ${callerApplication} failed (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}) for payment ${payload.paymentId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        if (isLastAttempt) {
          this.logger.error(
            `Giving up on webhook delivery to ${callerApplication} for payment ${payload.paymentId} — relying on the caller's own reconciliation.`,
          );
          return;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAYS_MS[attempt]),
        );
      }
    }
  }
}
