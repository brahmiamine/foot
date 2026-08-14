import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentProviderName } from './enums/payment-provider.enum';
import { PaymentService } from './payment.service';

const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1h — voir docstring de classe
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // TASK-P0-015 : PENDING depuis plus d'1h
const BATCH_SIZE = 50;
const STILL_PENDING_ALERT_THRESHOLD = 10;

export interface ReconciliationReport {
  staleCount: number;
  resolvedCount: number;
  stillPendingCount: number;
  timestamp: string;
}

/**
 * TASK-P0-015 : réconciliation périodique des paiements PENDING depuis plus
 * d'1h — un webhook perdu (panne fournisseur, coupure réseau) laisserait
 * sinon un paiement bloqué PENDING indéfiniment, alors même que le
 * fournisseur a peut-être déjà confirmé le paiement. Toutes les heures
 * (plutôt que littéralement une fois par jour comme suggéré par le nom de
 * la tâche : un webhook perdu mérite d'être rattrapé plus vite qu'en 24h,
 * "au moins quotidien" reste respecté).
 *
 * Réutilise directement `handleKonnectWebhook`/`handleFlouciWebhook` — même
 * logique de vérification server-à-server et de transition PAID (avec
 * enqueue outbox) que le webhook réel, donc un paiement résolu ici déclenche
 * la même notification/webhook applicatif qu'un webhook reçu normalement
 * (voir "Créer outbox event si COMPLETED" dans le backlog).
 *
 * Paymee exclu : son intégration (`PaymeeClient`) n'expose aucune méthode
 * de consultation de statut server-à-server, seulement `createPayment` — la
 * vérification Paymee dépend entièrement du webhook signé (checksum), qui
 * ne peut pas être simulé côté serveur sans le payload du fournisseur.
 * Documenté honnêtement plutôt que masqué : un paiement Paymee dont le
 * webhook s'est perdu ne peut être récupéré que manuellement (ops) tant que
 * cette lacune de l'intégration Paymee n'est pas comblée.
 */
@Injectable()
export class PaymentReconciliationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PaymentReconciliationService.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastReport: ReconciliationReport | null = null;

  constructor(
    @InjectRepository(Payment)
    private readonly repository: Repository<Payment>,
    private readonly paymentService: PaymentService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.reconcileStalePayments();
    }, POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  getLastReport(): ReconciliationReport | null {
    return this.lastReport;
  }

  async reconcileStalePayments(): Promise<ReconciliationReport> {
    const timestamp = new Date().toISOString();
    if (this.isRunning) {
      return (
        this.lastReport ?? {
          staleCount: 0,
          resolvedCount: 0,
          stillPendingCount: 0,
          timestamp,
        }
      );
    }
    this.isRunning = true;

    try {
      const staleCutoff = new Date(Date.now() - STALE_THRESHOLD_MS);
      const stalePayments = await this.repository.find({
        where: {
          status: PaymentStatus.PENDING,
          createdAt: LessThan(staleCutoff),
          provider: In([
            PaymentProviderName.KONNECT,
            PaymentProviderName.FLOUCI,
          ]),
        },
        order: { createdAt: 'ASC' },
        take: BATCH_SIZE,
      });

      let resolvedCount = 0;
      for (const payment of stalePayments) {
        if (!payment.providerRef) continue; // jamais initié côté fournisseur, rien à interroger

        try {
          if (payment.provider === PaymentProviderName.KONNECT) {
            await this.paymentService.handleKonnectWebhook(payment.providerRef);
          } else {
            await this.paymentService.handleFlouciWebhook(payment.providerRef);
          }

          const reloaded = await this.repository.findOne({
            where: { id: payment.id },
          });
          if (reloaded && reloaded.status !== PaymentStatus.PENDING) {
            resolvedCount++;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Reconciliation failed for payment ${payment.id}: ${message}`,
          );
        }
      }

      const stillPendingCount = stalePayments.length - resolvedCount;
      const report: ReconciliationReport = {
        staleCount: stalePayments.length,
        resolvedCount,
        stillPendingCount,
        timestamp,
      };
      this.lastReport = report;

      this.logger.log(`Payment reconciliation: ${JSON.stringify(report)}`);
      if (stillPendingCount > STILL_PENDING_ALERT_THRESHOLD) {
        this.logger.error(
          `Reconciliation alert: ${stillPendingCount} payments still PENDING after reconciliation (threshold: ${STILL_PENDING_ALERT_THRESHOLD}).`,
        );
      }

      return report;
    } finally {
      this.isRunning = false;
    }
  }
}
