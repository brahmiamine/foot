import { randomUUID } from 'crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentApiClientService } from '../checkout/payments-client.service';
import { SellerOrder } from '../seller-orders/entities/seller-order.entity';
import { SellerOrderStatus } from '../seller-orders/enums/seller-order-status.enum';
import { Payout } from './entities/payout.entity';
import { PayoutStatus } from './enums/payout-status.enum';

/** Payouts qui ont déjà "réservé" une part du solde livré (US-47). */
const CLAIMED_PAYOUT_STATUSES = [
  PayoutStatus.PENDING,
  PayoutStatus.PROCESSING,
  PayoutStatus.PAID,
];

@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(Payout)
    private readonly repository: Repository<Payout>,
    @InjectRepository(SellerOrder)
    private readonly sellerOrderRepository: Repository<SellerOrder>,
    private readonly paymentApiClient?: PaymentApiClientService,
  ) {}

  async findAllForSeller(sellerId: string): Promise<Payout[]> {
    return this.repository.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * US-47 — orders delivered - returns - refunds - club commission =
   * available balance. La commission est déjà déduite dans
   * `SellerOrder.netAmount` (voir seller-orders/entities/seller-order.entity.ts)
   * au moment de la commande, pas recalculée ici. Un retour complet
   * (`RETURNED`, voir Epic E16) sort mécaniquement la commande du total
   * `DELIVERED` — pas de soustraction séparée nécessaire, le modèle ne
   * supporte pas les retours partiels par ligne. Les payouts déjà PENDING/
   * PROCESSING/PAID sont déduits pour ne jamais recompter un montant déjà
   * réclamé par un payout antérieur.
   */
  async computeAvailableBalance(sellerId: string): Promise<number> {
    const deliveredRow = await this.sellerOrderRepository
      .createQueryBuilder('so')
      .select('COALESCE(SUM(so.netAmount), 0)', 'total')
      .where('so.sellerId = :sellerId', { sellerId })
      .andWhere('so.status = :status', { status: SellerOrderStatus.DELIVERED })
      .getRawOne<{ total: string }>();

    const claimedRow = await this.repository
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.sellerId = :sellerId', { sellerId })
      .andWhere('p.status IN (:...statuses)', {
        statuses: CLAIMED_PAYOUT_STATUSES,
      })
      .getRawOne<{ total: string }>();

    const delivered = Number(deliveredRow?.total ?? 0);
    const claimed = Number(claimedRow?.total ?? 0);
    return Math.max(0, delivered - claimed);
  }

  /**
   * US-48 — crée un payout PENDING pour tout le solde disponible. La
   * période couverte va de la plus ancienne commande `DELIVERED` de ce
   * vendeur à aujourd'hui — approximation V1 documentée (pas de lien
   * explicite payout <-> commandes couvertes, à affiner si un vrai
   * rapprochement comptable est requis).
   */
  async create(sellerId: string): Promise<Payout> {
    const available = await this.computeAvailableBalance(sellerId);
    if (available <= 0) {
      throw new ConflictException('Aucun solde disponible pour ce vendeur');
    }

    const oldestDelivered = await this.sellerOrderRepository
      .createQueryBuilder('so')
      .select('MIN(so.createdAt)', 'oldest')
      .where('so.sellerId = :sellerId', { sellerId })
      .andWhere('so.status = :status', { status: SellerOrderStatus.DELIVERED })
      .getRawOne<{ oldest: string | Date | null }>();

    const now = new Date();
    const periodStart = oldestDelivered?.oldest
      ? new Date(oldestDelivered.oldest).toISOString().slice(0, 10)
      : now.toISOString().slice(0, 10);

    const payout = this.repository.create({
      sellerId,
      reference: `PO-${randomUUID().slice(0, 8).toUpperCase()}`,
      amount: available.toFixed(3),
      status: PayoutStatus.PENDING,
      periodStart,
      periodEnd: now.toISOString().slice(0, 10),
      attempts: 0,
      lastError: null,
    });
    return this.repository.save(payout);
  }

  private async findOne(id: string): Promise<Payout> {
    const payout = await this.repository.findOne({ where: { id } });
    if (!payout) throw new NotFoundException('Payout introuvable');
    return payout;
  }

  /** US-48 — PENDING -> PROCESSING */
  async markProcessing(id: string): Promise<Payout> {
    const payout = await this.findOne(id);
    if (payout.status !== PayoutStatus.PENDING) {
      throw new ConflictException(
        `Transition ${payout.status} → PROCESSING non autorisée`,
      );
    }
    payout.status = PayoutStatus.PROCESSING;
    payout.attempts += 1;
    return this.repository.save(payout);
  }

  /**
   * US-48 + PAY-004 — PROCESSING -> PAID. Le settlement est enregistré
   * d'abord dans Payments avec payout.id comme clé idempotente. Si Payments
   * est indisponible, le payout reste PROCESSING et peut être rejoué sans
   * créer une seconde écriture financière.
   */
  async markPaid(id: string): Promise<Payout> {
    const payout = await this.findOne(id);
    if (payout.status !== PayoutStatus.PROCESSING) {
      throw new ConflictException(
        `Transition ${payout.status} → PAID non autorisée`,
      );
    }
    const paidAt = new Date();
    await this.paymentApiClient?.recordSettlement({
      settlementId: payout.id,
      amount: Number(payout.amount),
      beneficiaryType: 'SELLER',
      beneficiaryId: payout.sellerId,
      reference: payout.reference,
      occurredAt: paidAt.toISOString(),
    });
    payout.status = PayoutStatus.PAID;
    payout.paidAt = paidAt;
    payout.lastError = null;
    return this.repository.save(payout);
  }

  /** US-49 — PROCESSING -> FAILED, motif obligatoire (audit). */
  async markFailed(id: string, reason: string): Promise<Payout> {
    const payout = await this.findOne(id);
    if (payout.status !== PayoutStatus.PROCESSING) {
      throw new ConflictException(
        `Transition ${payout.status} → FAILED non autorisée`,
      );
    }
    payout.status = PayoutStatus.FAILED;
    payout.lastError = reason;
    return this.repository.save(payout);
  }

  /**
   * US-49 — retry : FAILED -> PENDING pour rejouer le virement. `attempts`
   * n'est pas réinitialisé (audit des tentatives précédentes conservé) ;
   * `lastError` reste renseigné jusqu'à la prochaine tentative pour garder
   * une trace du dernier échec tant que le retry n'a pas abouti.
   */
  async retry(id: string): Promise<Payout> {
    const payout = await this.findOne(id);
    if (payout.status !== PayoutStatus.FAILED) {
      throw new ConflictException(
        `Retry impossible : payout au statut ${payout.status} (attendu FAILED)`,
      );
    }
    payout.status = PayoutStatus.PENDING;
    return this.repository.save(payout);
  }
}
