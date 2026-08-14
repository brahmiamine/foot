import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ReturnsService } from './returns.service';

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 min
const BATCH_SIZE = 50;

export interface ReturnRefundReconciliationReport {
  checked: number;
  resolved: number;
  timestamp: string;
}

/**
 * TASK-P0-006 (todo.md). Filet de sécurité pour les remboursements de
 * retour restés en `REQUESTED`/`PROCESSING`/`MANUAL_REVIEW` chez
 * payments (Konnect/Paymee/remboursement partiel n'ont pas de webhook
 * de remboursement, voir payments/README.md § Remboursements) : sans
 * relecture périodique, un retour resterait indéfiniment `COMPLETED` tant
 * qu'un opérateur n'a pas confirmé/rejeté le dossier `MANUAL_REVIEW` côté
 * payments. Même pattern que CheckoutReconciliationService — la
 * logique métier reste dans ReturnsService, ce service n'orchestre que le
 * scheduling et le lot.
 */
@Injectable()
export class ReturnRefundReconciliationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ReturnRefundReconciliationService.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastReport: ReturnRefundReconciliationReport | null = null;

  constructor(private readonly returnsService: ReturnsService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.reconcile();
    }, POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  getLastReport(): ReturnRefundReconciliationReport | null {
    return this.lastReport;
  }

  async reconcile(): Promise<ReturnRefundReconciliationReport> {
    const timestamp = new Date().toISOString();
    if (this.isRunning) {
      return this.lastReport ?? { checked: 0, resolved: 0, timestamp };
    }
    this.isRunning = true;

    try {
      const pending = await this.returnsService.findPendingRefunds(BATCH_SIZE);
      let resolved = 0;
      for (const returnRequest of pending) {
        try {
          const changed =
            await this.returnsService.reconcileRefund(returnRequest);
          if (changed) resolved++;
        } catch (error) {
          this.logger.warn(
            `Refund reconciliation failed for return ${returnRequest.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      const report: ReturnRefundReconciliationReport = {
        checked: pending.length,
        resolved,
        timestamp,
      };
      this.lastReport = report;
      if (report.checked > 0) {
        this.logger.log(
          `Return refund reconciliation: ${JSON.stringify(report)}`,
        );
      }
      return report;
    } finally {
      this.isRunning = false;
    }
  }
}
