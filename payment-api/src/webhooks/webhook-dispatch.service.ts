import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createHmac } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { webhookUrlsConfig } from './webhook-urls.config';

export interface WebhookPayload {
  eventId: string;
  paymentId: string;
  orderId: string;
  status:
    'PAID' | 'REFUND_SUCCEEDED' | 'REFUND_FAILED' | 'REFUND_MANUAL_REVIEW';
  provider: string;
  providerRef: string;
  amount: string;
  currency: string;
  userId: string | null;
  /** Only present for refund-related statuses. */
  refundId?: string;
}

const REQUEST_TIMEOUT_MS = 5000;

/**
 * Delivers a signed payment webhook to the calling application — voir
 * avancement.md, "Boucles fermées post-paiement". Un seul essai : ne
 * retente plus elle-même (TS-13) — c'est désormais
 * OutboxWorkerService (../outbox/outbox-worker.service.ts) qui possède le
 * calendrier de retry durable (minutes → heures, survit à un redémarrage),
 * en rejouant tout l'événement outbox plutôt qu'en boucle interne éphémère.
 * Lève en cas d'échec (réseau, timeout, URL/secret absents ne sont PAS des
 * échecs — juste rien à faire) pour que l'appelant sache qu'il doit
 * reprogrammer.
 *
 * Signature HMAC-SHA256 du corps JSON brut avec PAYMENT_WEBHOOK_SECRET
 * (header `X-Payment-Signature: sha256=<hex>`), à vérifier côté receveur
 * avant de faire confiance au contenu — même esprit que Konnect/Paymee/
 * Flouci envers payment-api, dans l'autre sens.
 */
@Injectable()
export class WebhookDispatchService {
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

    await firstValueFrom(
      this.httpService.post(url, body, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'X-Payment-Signature': `sha256=${signature}`,
        },
      }),
    );
  }
}
