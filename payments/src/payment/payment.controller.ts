import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';

/**
 * Provider-agnostic payment read API. Provider-specific actions (initiating
 * a payment, receiving a webhook) live under their own provider routes,
 * e.g. POST/GET /payments/konnect/*.
 *
 * Reserved to backend applications of the ecosystem (never called directly
 * by an end-user client): protected by ServiceAuthGuard.
 */
@Controller('payments')
@UseGuards(ServiceAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<Payment> {
    return this.paymentService.findById(id);
  }
}
