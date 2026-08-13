import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../../../auth/guards/service-auth.guard';
import { CurrentService } from '../../../auth/decorators/current-service.decorator';
import type { AuthenticatedService } from '../../../auth/interfaces/authenticated-service.interface';
import { PaymentService } from '../../payment.service';
import { InitPaymentDto } from '../../dto/init-payment.dto';
import { InitPaymentResultDto } from '../../dto/init-payment-result.dto';
import { KonnectWebhookQueryDto } from './dto/konnect-webhook-query.dto';
import { KonnectError, toHttpException } from './konnect.exceptions';

/**
 * All Konnect-specific HTTP surface (both the inbound webhook and the
 * init-payment trigger) lives here, isolated from the generic payment API.
 */
@Controller('payments/konnect')
export class KonnectController {
  private readonly logger = new Logger(KonnectController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /** Reserved to backend applications of the ecosystem. */
  @Post('init')
  @UseGuards(ServiceAuthGuard)
  async init(
    @Body() dto: InitPaymentDto,
    @CurrentService() service: AuthenticatedService,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<InitPaymentResultDto> {
    try {
      return await this.paymentService.initiateKonnectPayment(
        dto,
        service.application,
        idempotencyKey,
      );
    } catch (error) {
      if (error instanceof KonnectError) {
        throw toHttpException(error);
      }
      throw error;
    }
  }

  /**
   * Konnect calls this with GET /payments/konnect/webhook?payment_ref=...
   * https://docs.konnect.network/docs/en/api-integration/endpoints/webhook
   *
   * Always acknowledges with 200 once the notification has been durably
   * processed (or safely ignored as a duplicate), so Konnect stops retrying.
   * Real verification always happens server-to-server against Konnect's
   * get-payment-details endpoint — the query param alone is never trusted.
   */
  @Get('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Query() query: KonnectWebhookQueryDto,
  ): Promise<{ received: true }> {
    try {
      await this.paymentService.handleKonnectWebhook(query.payment_ref);
    } catch (error) {
      if (error instanceof KonnectError) {
        this.logger.warn(
          `Webhook processing failed for a payment_ref: ${error.code}`,
        );
        throw toHttpException(error);
      }
      throw error;
    }
    return { received: true };
  }
}
