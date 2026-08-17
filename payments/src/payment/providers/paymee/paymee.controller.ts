import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../../../auth/guards/service-auth.guard';
import { CurrentService } from '../../../auth/decorators/current-service.decorator';
import type { AuthenticatedService } from '../../../auth/interfaces/authenticated-service.interface';
import { PaymentRoutingPolicyService } from '../../payment-routing-policy.service';
import { PaymentService } from '../../payment.service';
import { PaymentProviderName } from '../../enums/payment-provider.enum';
import { InitPaymeePaymentDto } from './dto/init-paymee-payment.dto';
import { InitPaymeePaymentResultDto } from './dto/init-paymee-payment-result.dto';
import { PaymeeWebhookDto } from './dto/paymee-webhook.dto';
import { PaymeeError, toHttpException } from './paymee.exceptions';

/**
 * All Paymee-specific HTTP surface (both the init-payment trigger and the
 * inbound webhook) lives here, isolated from the generic payment API.
 */
@Controller('payments/providers/paymee')
export class PaymeeController {
  private readonly logger = new Logger(PaymeeController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly routingPolicyService: PaymentRoutingPolicyService,
  ) {}

  /** Reserved to backend applications of the ecosystem. */
  @Post('init')
  @UseGuards(ServiceAuthGuard)
  async init(
    @Body() dto: InitPaymeePaymentDto,
    @CurrentService() service: AuthenticatedService,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<InitPaymeePaymentResultDto> {
    await this.routingPolicyService.assertProviderEnabledForInitiation(
      service.application,
      PaymentProviderName.PAYMEE,
      idempotencyKey,
    );
    try {
      return await this.paymentService.initiatePaymeePayment(
        dto,
        service.application,
        idempotencyKey,
      );
    } catch (error) {
      if (error instanceof PaymeeError) {
        throw toHttpException(error);
      }
      throw error;
    }
  }

  /**
   * Paymee calls this with POST /payments/providers/paymee/webhook.
   * https://www.paymee.tn/paymee-integration-with-redirection/
   *
   * Always acknowledges with 200 once the notification has been durably
   * processed (or safely ignored as a duplicate), so Paymee stops
   * retrying. The check_sum is verified before any internal payment
   * lookup — the payload alone is never trusted.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Body() payload: PaymeeWebhookDto,
  ): Promise<{ received: true }> {
    try {
      await this.paymentService.handlePaymeeWebhook(payload);
    } catch (error) {
      if (error instanceof PaymeeError) {
        this.logger.warn(
          `Webhook processing failed for a Paymee token: ${error.code}`,
        );
        throw toHttpException(error);
      }
      throw error;
    }
    return { received: true };
  }
}
