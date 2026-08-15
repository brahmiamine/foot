import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { CurrentService } from '../auth/decorators/current-service.decorator';
import type { AuthenticatedService } from '../auth/interfaces/authenticated-service.interface';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';

@Controller('payments')
@UseGuards(ServiceAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentService() service: AuthenticatedService,
  ): Promise<Payment> {
    const payment = await this.paymentService.findById(id);
    if (payment.callerApplication !== service.application) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }
}
