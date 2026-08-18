import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MarketOrder } from '../orders/entities/market-order.entity';
import { SellerOrder } from '../seller-orders/entities/seller-order.entity';
import { Seller } from '../sellers/entities/seller.entity';

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

interface FinancialAllocationEntry {
  component: 'CLUB_NET' | 'SELLER_NET';
  amount: number;
  beneficiaryId: string;
  reference: string;
}

interface FinancialAllocation {
  entries: FinancialAllocationEntry[];
}

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

export interface RecordSettlementInput {
  settlementId: string;
  amount: number;
  beneficiaryType: 'SELLER' | 'CLUB' | 'PLATFORM';
  beneficiaryId?: string;
  reference?: string;
  occurredAt?: string;
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

  constructor(
    @InjectRepository(MarketOrder)
    private readonly orderRepository?: Repository<MarketOrder>,
    @InjectRepository(SellerOrder)
    private readonly sellerOrderRepository?: Repository<SellerOrder>,
    @InjectRepository(Seller)
    private readonly sellerRepository?: Repository<Seller>,
  ) {}

  private getConfig(): { baseUrl: string; apiKey: string } {
    const baseUrl = process.env.PAYMENT_API_URL;
    const apiKey = process.env.PAYMENT_API_KEY;
    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException(
        'PAYMENT_API_URL et PAYMENT_API_KEY doivent être configurés pour accepter des paiements réels.',
      );
    }
    return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey };
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

    const allocation = await this.buildFinancialAllocation(
      input.orderId,
      input.amount,
    );
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

    if (allocation) {
      await this.registerFinancialAllocation(data.paymentId, allocation);
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

  async recordSettlement(input: RecordSettlementInput): Promise<void> {
    const { baseUrl, apiKey } = this.getConfig();
    const response = await fetch(`${baseUrl}/financial-ledger/settlements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        settlementId: input.settlementId,
        amount: input.amount,
        currency: 'TND',
        beneficiaryType: input.beneficiaryType,
        beneficiaryId: input.beneficiaryId,
        reference: input.reference,
        occurredAt: input.occurredAt,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(
        `payments settlement recording failed (${response.status}): ${text}`,
      );
      throw new ServiceUnavailableException(
        "Échec de l'enregistrement comptable du reversement.",
      );
    }
  }

  private async registerFinancialAllocation(
    paymentId: string,
    allocation: FinancialAllocation,
  ): Promise<void> {
    const { baseUrl, apiKey } = this.getConfig();
    const response = await fetch(
      `${baseUrl}/financial-ledger/payments/${paymentId}/allocations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(allocation),
      },
    );
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(
        `payments financial allocation failed (${response.status}): ${text}`,
      );
      throw new ServiceUnavailableException(
        "Échec de l'enregistrement de l'allocation financière.",
      );
    }
  }

  private async buildFinancialAllocation(
    orderNumber: string,
    grossAmount: number,
  ): Promise<FinancialAllocation | null> {
    if (
      !this.orderRepository ||
      !this.sellerOrderRepository ||
      !this.sellerRepository
    ) {
      return null;
    }
    const order = await this.orderRepository.findOne({
      where: { orderNumber },
    });
    if (!order) {
      throw new ServiceUnavailableException(
        `Commande marketplace ${orderNumber} introuvable pour le ledger.`,
      );
    }
    const sellerOrders = await this.sellerOrderRepository.find({
      where: { orderId: order.id },
      order: { id: 'ASC' },
    });
    if (sellerOrders.length === 0) {
      throw new ServiceUnavailableException(
        `Aucune sous-commande vendeur pour ${orderNumber}.`,
      );
    }
    const sellerIds = [...new Set(sellerOrders.map((item) => item.sellerId))];
    const sellers = await this.sellerRepository.find({
      where: { id: In(sellerIds) },
    });
    const sellerById = new Map(sellers.map((seller) => [seller.id, seller]));
    const entries: FinancialAllocationEntry[] = [];

    for (const sellerOrder of sellerOrders) {
      const seller = sellerById.get(sellerOrder.sellerId);
      if (!seller) {
        throw new ServiceUnavailableException(
          `Vendeur ${sellerOrder.sellerId} introuvable pour le ledger.`,
        );
      }
      const subtotalMinor = this.toMinor(Number(sellerOrder.subtotal));
      const sellerNetMinor = this.toMinor(Number(sellerOrder.netAmount));
      const clubNetMinor = subtotalMinor - sellerNetMinor;
      if (sellerNetMinor > 0) {
        entries.push({
          component: 'SELLER_NET',
          amount: sellerNetMinor / 1000,
          beneficiaryId: sellerOrder.sellerId,
          reference: `${sellerOrder.id}:seller-net`,
        });
      }
      if (clubNetMinor > 0) {
        entries.push({
          component: 'CLUB_NET',
          amount: clubNetMinor / 1000,
          beneficiaryId: seller.clubId,
          reference: `${sellerOrder.id}:club-net`,
        });
      }
    }

    const allocatedMinor = entries.reduce(
      (total, entry) => total + this.toMinor(entry.amount),
      0,
    );
    const grossMinor = this.toMinor(grossAmount);
    if (allocatedMinor !== grossMinor) {
      throw new ServiceUnavailableException(
        `Allocation marketplace incohérente pour ${orderNumber}: ${allocatedMinor} != ${grossMinor} millimes.`,
      );
    }
    return { entries };
  }

  private toMinor(amount: number): number {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new ServiceUnavailableException('Montant financier marketplace invalide.');
    }
    return Math.round(amount * 1000);
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
