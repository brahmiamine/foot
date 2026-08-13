import { Controller, Get } from '@nestjs/common';
import { InventoryService } from './inventory.service';

/**
 * TASK-P0-005 (todo.md) : expose la métrique d'oversell ("cible zéro") pour
 * les ops — même pattern que payment-api/src/payment/payment-reconciliation-health.controller.ts.
 * Non authentifiée, une sonde d'infra, pas une API.
 */
@Controller('health/inventory')
export class InventoryHealthController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async check() {
    const report = await this.inventoryService.detectOversell();
    return {
      status: report.violatingItemCount > 0 ? 'degraded' : 'ok',
      ...report,
    };
  }
}
