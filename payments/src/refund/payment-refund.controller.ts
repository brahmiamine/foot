import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { CurrentService } from '../auth/decorators/current-service.decorator';
import type { AuthenticatedService } from '../auth/interfaces/authenticated-service.interface';
import { Payment } from '../payment/entities/payment.entity';
import { RefundService } from './refund.service';
import { Refund } from './entities/refund.entity';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RemainingRefundableDto } from './dto/refund-response.dto';

function optionalActorUserId(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const actorUserId = value.trim();
  if (!actorUserId || actorUserId.length > 100) {
    throw new BadRequestException('Invalid x-actor-user-id header');
  }
  return actorUserId;
}

@Controller('payments/:paymentId/refunds')
@UseGuards(ServiceAuthGuard)
export class PaymentRefundController {
  constructor(
    private readonly refundService: RefundService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  private async assertPaymentOwnedByCaller(
    paymentId: string,
    service: AuthenticatedService,
  ): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, callerApplication: service.application },
    });
    if (!payment) throw new NotFoundException('Payment not found');
  }

  @Post()
  async create(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: CreateRefundDto,
    @CurrentService() service: AuthenticatedService,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-actor-user-id') actorUserHeader?: string,
  ): Promise<Refund> {
    await this.assertPaymentOwnedByCaller(paymentId, service);
    return this.refundService.createRefund(
      paymentId,
      dto,
      service.application,
      idempotencyKey,
      optionalActorUserId(actorUserHeader),
    );
  }

  @Get()
  async list(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @CurrentService() service: AuthenticatedService,
  ): Promise<Refund[]> {
    await this.assertPaymentOwnedByCaller(paymentId, service);
    return this.refundService.listForPayment(paymentId);
  }

  @Get('remaining')
  async remaining(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @CurrentService() service: AuthenticatedService,
  ): Promise<RemainingRefundableDto> {
    await this.assertPaymentOwnedByCaller(paymentId, service);
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
