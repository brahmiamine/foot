import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
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
import { paymentRoutingConfig } from './payment-routing.config';
import {
  EffectivePaymentRoutingPolicy,
  PaymentRoutingPolicyService,
} from './payment-routing-policy.service';
import { PaymentService } from './payment.service';
import {
  KonnectError,
  toHttpException as konnectToHttpException,
} from './providers/konnect/konnect.exceptions';
import { PaymeeIntegrationMode } from './providers/paymee/dto/init-paymee-payment.dto';
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
    @Inject(paymentRoutingConfig.KEY)
    private readonly routingConfig: ConfigType<typeof paymentRoutingConfig>,
  ) {}

  // Two path segments deliberately avoid colliding with GET /payments/:id.
  @Get('routing/policy')
  async getRoutingPolicy(
    @CurrentService() service: AuthenticatedService,
  ): Promise<EffectivePaymentRoutingPolicy> {
    return this.routingPolicyService.getEffectivePolicy(service.application);
  }

  /**
   * Policy administration is deliberately separate from policy consumption.
   * A compromised consumer key therefore cannot simply re-enable a provider
   * that was disabled for that same consumer.
   */
  @Put('routing/policies/:consumerApplication')
  async updateRoutingPolicy(
    @Param('consumerApplication') consumerApplication: string,
    @Body() dto: UpdatePaymentRoutingPolicyDto,
    @CurrentService() service: AuthenticatedService,
  ): Promise<EffectivePaymentRoutingPolicy> {
    this.assertRoutingAdministrator(service.application);
    return this.routingPolicyService.updatePolicy(
      consumerApplication,
      dto,
      service.application,
    );
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

    // A retry keeps the provider selected by the original request even if
    // the routing policy changed in the meantime.
    if (existing) {
      return this.fromExisting(existing);
    }

    const provider = await this.routingPolicyService.resolveProvider(
      service.application,
      dto.preferredProvider,
    );

    try {
      let paymentId: string;
      switch (provider) {
        case PaymentProviderName.KONNECT: {
          const result = await this.paymentService.initiateKonnectPayment(
            dto,
            service.application,
            idempotencyKey,
          );
          paymentId = result.paymentId;
          break;
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
          paymentId = result.paymentId;
          break;
        }
        case PaymentProviderName.FLOUCI: {
          const result = await this.paymentService.initiateFlouciPayment(
            dto,
            service.application,
            idempotencyKey,
          );
          paymentId = result.paymentId;
          break;
        }
        default:
          throw new Error(`Unsupported payment provider: ${String(provider)}`);
      }

      // Read back the durable record instead of trusting the selected enum:
      // under a concurrent idempotent race the provider service may return
      // the payment created by another request, whose provider is authoritative.
      return this.fromExisting(await this.paymentService.findById(paymentId));
    } catch (error) {
      if (error instanceof KonnectError) throw konnectToHttpException(error);
      if (error instanceof PaymeeError) throw paymeeToHttpException(error);
      if (error instanceof FlouciError) throw flouciToHttpException(error);
      throw error;
    }
  }

  private assertRoutingAdministrator(application: string): void {
    if (!this.routingConfig.adminApplications.includes(application)) {
      throw new ForbiddenException(
        'This application is not allowed to administer payment routing policies',
      );
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
