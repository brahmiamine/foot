import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository } from 'typeorm';
import { MarketOrder } from '../orders/entities/market-order.entity';
import { MarketOrderStatus } from '../orders/enums/market-order-status.enum';
import { InventoryService } from '../inventory/inventory.service';
import { CheckoutService } from './checkout.service';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 min
// Alignée sur le TTL de réservation de InventoryService.reserveStock — au
// même moment où le stock réservé de la commande redevient disponible, la
// commande elle-même doit être visiblement annulée plutôt que de rester
// PENDING indéfiniment.
const STALE_ORDER_TTL_MS = 30 * 60 * 1000;
const BATCH_SIZE = 50;

export interface CheckoutReconciliationReport {
  staleOrdersExpired: number;
  pendingPaymentsResolved: number;
  reservationsExpired: number;
  timestamp: string;
}

/**
 * TASK-P0-004 (todo.md). Deux responsabilités périodiques :
 * 1. Annule les commandes PENDING abandonnées (jamais payées) depuis plus
 *    de STALE_ORDER_TTL_MS et relâche leur stock réservé — sans ça, un
 *    panier abandonné en cours de paiement bloquerait du stock
 *    indéfiniment.
 * 2. Filet de sécurité pour les commandes PENDING encore dans le délai :
 *    relit leur statut auprès de payments au cas où le webhook
 *    applicatif (CheckoutController) aurait été perdu — même rôle que
 *    payments/src/payment/payment-reconciliation.service.ts côté
 *    payments lui-même.
 * Délègue aussi le nettoyage périodique des réservations de stock
 * orphelines (InventoryService.expireStaleReservations) — sans commande
 * PENDING correspondante qui a raté sa propre expiration (ne devrait pas
 * arriver via le flux normal, filet de sécurité).
 */
@Injectable()
export class CheckoutReconciliationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CheckoutReconciliationService.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastReport: CheckoutReconciliationReport | null = null;

  constructor(
    @InjectRepository(MarketOrder)
    private readonly orderRepository: Repository<MarketOrder>,
    private readonly checkoutService: CheckoutService,
    private readonly inventoryService: InventoryService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.reconcile();
    }, POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  getLastReport(): CheckoutReconciliationReport | null {
    return this.lastReport;
  }

  async reconcile(): Promise<CheckoutReconciliationReport> {
    const timestamp = new Date().toISOString();
    if (this.isRunning) {
      return (
        this.lastReport ?? {
          staleOrdersExpired: 0,
          pendingPaymentsResolved: 0,
          reservationsExpired: 0,
          timestamp,
        }
      );
    }
    this.isRunning = true;

    try {
      const staleCutoff = new Date(Date.now() - STALE_ORDER_TTL_MS);

      const staleOrders = await this.orderRepository.find({
        where: {
          status: MarketOrderStatus.PENDING,
          createdAt: LessThan(staleCutoff),
        },
        take: BATCH_SIZE,
      });
      for (const order of staleOrders) {
        await this.checkoutService.cancelOrder(
          order.id,
          'Paiement non confirmé dans le délai imparti.',
        );
      }

      const stillPending = await this.orderRepository.find({
        where: {
          status: MarketOrderStatus.PENDING,
          paymentId: Not(IsNull()),
        },
        take: BATCH_SIZE,
      });
      let pendingPaymentsResolved = 0;
      for (const order of stillPending) {
        if (!order.paymentId) continue;
        try {
          await this.checkoutService.reconcilePaymentStatus(order.paymentId);
          const reloaded = await this.orderRepository.findOne({
            where: { id: order.id },
          });
          if (reloaded && reloaded.status !== MarketOrderStatus.PENDING) {
            pendingPaymentsResolved++;
          }
        } catch (error) {
          this.logger.warn(
            `Reconciliation failed for order ${order.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      const { expired: reservationsExpired } =
        await this.inventoryService.expireStaleReservations();

      const report: CheckoutReconciliationReport = {
        staleOrdersExpired: staleOrders.length,
        pendingPaymentsResolved,
        reservationsExpired,
        timestamp,
      };
      this.lastReport = report;
      if (
        report.staleOrdersExpired > 0 ||
        report.pendingPaymentsResolved > 0 ||
        report.reservationsExpired > 0
      ) {
        this.logger.log(`Checkout reconciliation: ${JSON.stringify(report)}`);
      }
      return report;
    } finally {
      this.isRunning = false;
    }
  }
}
