import { Controller, Get } from '@nestjs/common';
import { CheckoutReconciliationService } from './checkout-reconciliation.service';

/**
 * TASK-P0-004 (todo.md) : dernier rapport de réconciliation périodique du
 * checkout — même pattern que payments/src/payment/payment-reconciliation-health.controller.ts.
 * Non authentifiée, une sonde d'infra.
 */
@Controller('health/checkout')
export class CheckoutReconciliationHealthController {
  constructor(
    private readonly reconciliationService: CheckoutReconciliationService,
  ) {}

  @Get()
  check() {
    return { lastReport: this.reconciliationService.getLastReport() };
  }
}
