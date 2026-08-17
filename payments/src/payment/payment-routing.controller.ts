import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentService } from '../auth/decorators/current-service.decorator';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import type { AuthenticatedService } from '../auth/interfaces/authenticated-service.interface';
import { RoutedInitPaymentDto } from './dto/routed-init-payment.dto';
import { RoutedInitPaymentResultDto } from './dto/routed-init-payment-result.dto';
import { UpdatePaymentRoutingPolicyDto } from './dto/update-payment-routing-policy.dto';
import { Payment } from './entities/payment.entity';
import { PaymentProviderName } from './enums/payment-provider.enum';
import {
  EffectivePaymentRoutingPolicy,
  PaymentRoutingPolicyService,
} from './payment-routing-policy.service';
import { PaymentService } from './payment.service';
import {
  KonnectError,
  toHttpException as konnectToHttpException,
} from './providers/konnect/konnect.exceptions';
import {
  PaymeeIntegrationMode,
} from './providers/paymee/dto/init-paymee-payment.dto';
import {
  PaymeeError,
  toHttpException as paymeeToHttpException,
} from './providers/paymee/paymee.exceptions';
import {
  FlouciError,
  toHttpException as flouciToHttpException,
} from './providers/flouci/flouci.exceptions';

@Controller('payments')
@UseGuards(ServiceAuthGuard)
export class PaymentRoutingController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly routingPolicyService: PaymentRoutingPolicyService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  @Get('routing-policy')
  async getRoutingPolicy(
    @CurrentService() service: AuthenticatedService,
  ): Promise<EffectivePaymentRoutingPolicy> {
    return this.routingPolicyService.getEffectivePolicy(service.application);
  }

  @Put('routing-policy')
  async updateRoutingPolicy(
    @Body() dto: UpdatePaymentRoutingPolicyDto,
    @CurrentService() service: AuthenticatedService,
  ): Promise<EffectivePaymentRoutingPolicy> {
    return this.routingPolicyService.updatePolicy(service.application, dto);
  }

  /**
   * Provider-agnostic init endpoint. Routing happens entirely from the
   * authenticated consumer's policy. Fallback is resolved before any PSP
   * call; an ambiguous upstream/network failure is never retried on another
   * provider because doing so could create two external payment sessions.
   */
  @Post('init')
  async init(
    @Body() dto: RoutedInitPaymentDto,
    @CurrentService() service: AuthenticatedService,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<RoutedInitPaymentResultDto> {
    const existing = idempotencyKey
      ? await this.paymentRepository.findOne({
          where: {
            callerApplication: service.application,
            idempotencyKey,
          },
        })
      : null;

    if (existing) {
      return this.fromExisting(existing);
    }

    const provider = await this.routingPolicyService.resolveProvider(
      service.application,
      dto.preferredProvider,
    );

    try {
      switch (provider) {
        case PaymentProviderName.KONNECT: {
          const result = await this.paymentService.initiateKonnectPayment(
            dto,
            service.application,
            idempotencyKey,
          );
          return {
            paymentId: result.paymentId,
            provider,
            providerRef: result.providerRef,
            payUrl: result.payUrl,
          };
        }
        case PaymentProviderName.PAYMEE: {
          const result = await this.paymentService.initiatePaymeePayment(
            {
              orderId: dto.orderId,
              amount: dto.amount,
              firstName: dto.firstName,
              lastName: dto.lastName,
              email: dto.email,
              phoneNumber: dto.phoneNumber,
              userId: dto.userId,
              mode: PaymeeIntegrationMode.REDIRECT,
            },
            service.application,
            idempotencyKey,
          );
          return {
            paymentId: result.paymentId,
            provider,
            providerRef: result.token,
            payUrl: result.payUrl ?? '',
          };
        }
        case PaymentProviderName.FLOUCI: {
          const result = await this.paymentService.initiateFlouciPayment(
            dto,
            service.application,
            idempotencyKey,
          );
          return {
            paymentId: result.paymentId,
            provider,
            providerRef: result.providerRef,
            payUrl: result.payUrl,
          };
        }
      }
    } catch (error) {
      if (error instanceof KonnectError) throw konnectToHttpException(error);
      if (error instanceof PaymeeError) throw paymeeToHttpException(error);
      if (error instanceof FlouciError) throw flouciToHttpException(error);
      throw error;
    }
  }

  private fromExisting(payment: Payment): RoutedInitPaymentResultDto {
    return {
      paymentId: payment.id,
      provider: payment.provider,
      providerRef: payment.providerRef ?? '',
      payUrl: payment.payUrl ?? '',
    };
  }
}
