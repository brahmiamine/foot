import { Controller, Get } from '@nestjs/common';
import { PaymentReconciliationService } from './payment-reconciliation.service';

/**
 * TASK-P0-015 : expose le dernier rapport de réconciliation pour les ops,
 * même pattern que OutboxHealthController (TASK-P0-006). Non authentifié,
 * une sonde d'infra, pas une API.
 */
@Controller('health/reconciliation')
export class PaymentReconciliationHealthController {
  constructor(
    private readonly reconciliationService: PaymentReconciliationService,
  ) {}

  @Get()
  check() {
    const report = this.reconciliationService.getLastReport();
    return {
      status: report && report.stillPendingCount > 10 ? 'degraded' : 'ok',
      lastReport: report,
    };
  }
}
