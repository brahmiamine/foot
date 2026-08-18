import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * TASK-P0-004 (todo.md). Client HTTP serveur-à-serveur vers payments
 * (voir ../../payments/README.md) — même contrat que
 * ticketing/src/lib/paymentApiClient.ts et
 * club-hub/src/lib/paymentApiClient.ts, adapté en service NestJS
 * injectable. `fetch` natif (Node 18+) plutôt qu'ajouter @nestjs/axios
 * comme nouvelle dépendance pour ce seul besoin.
 */
const PROVIDER_INIT_PATHS: Record<string, string> = {
  konnect: '/payments/konnect/init',
  flouci: '/payments/providers/flouci/init',
  paymee: '/payments/providers/paymee/init',
};

export interface InitPaymentInput {
  orderId: string;
  amount: number;
  email: string;
  userId: string;
  idempotencyKey: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface InitPaymentResult {
  paymentId: string;
  payUrl: string;
}

export type PaymentApiStatus =
  'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'UNKNOWN';

export type RefundStatus =
  'REQUESTED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'MANUAL_REVIEW';

/**
 * PAY-002 keeps AWAITING_APPROVAL detailed in Payments. Marketplace only
 * needs a durable non-terminal reconciliation state, so it is normalized to
 * REQUESTED locally and continues to be polled until Payments resolves it.
 */
export function normalizeRefundStatus(
  status: string | undefined,
): RefundStatus | null {
  if (status === 'AWAITING_APPROVAL') return 'REQUESTED';
  if (
    status === 'REQUESTED' ||
    status === 'PROCESSING' ||
    status === 'SUCCEEDED' ||
    status === 'FAILED' ||
    status === 'MANUAL_REVIEW'
  ) {
    return status;
  }
  return null;
}

@Injectable()
export class PaymentApiClientService {
  private readonly logger = new Logger(PaymentApiClientService.name);

  private getConfig(): { baseUrl: string; apiKey: string } {
    const baseUrl = process.env.PAYMENT_API_URL;
    const apiKey = process.env.PAYMENT_API_KEY;
    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException(
        'PAYMENT_API_URL et PAYMENT_API_KEY doivent être configurés pour accepter des paiements réels.',
      );
    }
    return { baseUrl, apiKey };
  }

  getProvider(): string {
    return process.env.PAYMENT_PROVIDER || 'konnect';
  }

  async initPayment(input: InitPaymentInput): Promise<InitPaymentResult> {
    const { baseUrl, apiKey } = this.getConfig();
    const provider = this.getProvider();
    const path = PROVIDER_INIT_PATHS[provider];
    if (!path) {
      throw new ServiceUnavailableException(
        `PAYMENT_PROVIDER="${provider}" non supporté (konnect, flouci ou paymee).`,
      );
    }

    const body =
      provider === 'paymee'
        ? {
            orderId: input.orderId,
            amount: input.amount,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phoneNumber: input.phoneNumber,
            userId: input.userId,
            mode: 'redirect',
          }
        : {
            orderId: input.orderId,
            amount: input.amount,
            currency: 'TND',
            email: input.email,
            userId: input.userId,
            firstName: input.firstName,
            lastName: input.lastName,
            phoneNumber: input.phoneNumber,
          };

    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'idempotency-key': input.idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(`payments init failed (${response.status}): ${text}`);
      throw new ServiceUnavailableException(
        "Échec de l'initialisation du paiement.",
      );
    }

    const data = (await response.json()) as {
      paymentId?: string;
      payUrl?: string;
    };
    if (!data.paymentId || !data.payUrl) {
      throw new ServiceUnavailableException(
        'Réponse inattendue de payments : paymentId ou payUrl manquant.',
      );
    }

    return { paymentId: data.paymentId, payUrl: data.payUrl };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentApiStatus> {
    const { baseUrl, apiKey } = this.getConfig();

    const response = await fetch(`${baseUrl}/payments/${paymentId}`, {
      headers: { 'x-api-key': apiKey },
      cache: 'no-store',
    });

    if (response.status === 404) return 'UNKNOWN';
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Échec de la lecture du statut de paiement.',
      );
    }

    const data = (await response.json()) as { status?: string };
    const status = data.status;
    if (
      status === 'PENDING' ||
      status === 'PAID' ||
      status === 'FAILED' ||
      status === 'EXPIRED'
    ) {
      return status;
    }
    return 'UNKNOWN';
  }

  /** TASK-P0-006 (todo.md) : demande de remboursement (retours marketplace, ReturnsService). */
  async requestRefund(input: RequestRefundInput): Promise<RefundResult> {
    const { baseUrl, apiKey } = this.getConfig();

    const response = await fetch(
      `${baseUrl}/payments/${input.paymentId}/refunds`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'idempotency-key': input.idempotencyKey,
        },
        body: JSON.stringify({ amount: input.amount, reason: input.reason }),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(
        `payments refund request failed (${response.status}): ${text}`,
      );
      throw new ServiceUnavailableException(
        'Échec de la demande de remboursement.',
      );
    }

    const data = (await response.json()) as { id?: string; status?: string };
    const status = normalizeRefundStatus(data.status);
    if (!data.id || !status) {
      throw new ServiceUnavailableException(
        'Réponse inattendue de payments : id ou status de remboursement manquant.',
      );
    }
    return { id: data.id, status };
  }

  /** Relit le statut courant d'un remboursement déjà demandé (voir requestRefund). */
  async getRefundStatus(refundId: string): Promise<RefundStatus | 'UNKNOWN'> {
    const { baseUrl, apiKey } = this.getConfig();

    const response = await fetch(`${baseUrl}/refunds/${refundId}`, {
      headers: { 'x-api-key': apiKey },
      cache: 'no-store',
    });

    if (response.status === 404) return 'UNKNOWN';
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Échec de la lecture du statut de remboursement.',
      );
    }

    const data = (await response.json()) as {
      refund?: { status?: string };
    };
    return normalizeRefundStatus(data.refund?.status) ?? 'UNKNOWN';
  }
}

export interface RequestRefundInput {
  paymentId: string;
  /** Omis pour un remboursement total ; requis pour un retour marketplace (partiel par construction). */
  amount?: number;
  reason: string;
  /** Scopée par paiement côté payments — un même appel rejoué ne crée jamais un second remboursement. */
  idempotencyKey: string;
}

export interface RefundResult {
  id: string;
  status: RefundStatus;
}
