import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';

/**
 * Provider-agnostic payment read API. Provider-specific actions (initiating
 * a payment, receiving a webhook) live under their own provider routes,
 * e.g. POST/GET /payments/konnect/*.
 */
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<Payment> {
    return this.paymentService.findById(id);
  }
}
