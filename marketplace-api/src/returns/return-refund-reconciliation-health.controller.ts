import { Controller, Get } from '@nestjs/common';
import { ReturnRefundReconciliationService } from './return-refund-reconciliation.service';

/**
 * TASK-P0-006 (todo.md) : dernier rapport de réconciliation périodique des
 * remboursements de retour — même pattern que
 * checkout/checkout-reconciliation-health.controller.ts. Non authentifiée,
 * une sonde d'infra.
 */
@Controller('health/returns')
export class ReturnRefundReconciliationHealthController {
  constructor(
    private readonly reconciliationService: ReturnRefundReconciliationService,
  ) {}

  @Get()
  check() {
    return { lastReport: this.reconciliationService.getLastReport() };
  }
}
