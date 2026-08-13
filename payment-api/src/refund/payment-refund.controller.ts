import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { CurrentService } from '../auth/decorators/current-service.decorator';
import type { AuthenticatedService } from '../auth/interfaces/authenticated-service.interface';
import { RefundService } from './refund.service';
import { Refund } from './entities/refund.entity';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RemainingRefundableDto } from './dto/refund-response.dto';

/**
 * TASK-P0-001 (todo.md): refund operations scoped to a single payment.
 * Reserved to backend applications of the ecosystem, same as
 * PaymentController — never called directly by an end-user client.
 */
@Controller('payments/:paymentId/refunds')
@UseGuards(ServiceAuthGuard)
export class PaymentRefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post()
  async create(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: CreateRefundDto,
    @CurrentService() service: AuthenticatedService,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Refund> {
    return this.refundService.createRefund(
      paymentId,
      dto,
      service.application,
      idempotencyKey,
    );
  }

  @Get()
  async list(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ): Promise<Refund[]> {
    return this.refundService.listForPayment(paymentId);
  }

  @Get('remaining')
  async remaining(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ): Promise<RemainingRefundableDto> {
    const { payment, remaining } =
      await this.refundService.getRemainingRefundable(paymentId);
    return new RemainingRefundableDto(
      payment.id,
      payment.amount,
      payment.currency,
      remaining,
    );
  }
}
