import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../../../auth/guards/service-auth.guard';
import { CurrentService } from '../../../auth/decorators/current-service.decorator';
import type { AuthenticatedService } from '../../../auth/interfaces/authenticated-service.interface';
import { PaymentService } from '../../payment.service';
import { InitPaymentDto } from '../../dto/init-payment.dto';
import { InitPaymentResultDto } from '../../dto/init-payment-result.dto';
import { FlouciWebhookDto } from './dto/flouci-webhook.dto';
import { FlouciError, toHttpException } from './flouci.exceptions';

/**
 * All Flouci-specific HTTP surface (both the init-payment trigger and the
 * inbound webhook) lives here, isolated from the generic payment API.
 */
@Controller('payments/providers/flouci')
export class FlouciController {
  private readonly logger = new Logger(FlouciController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /** Reserved to backend applications of the ecosystem. */
  @Post('init')
  @UseGuards(ServiceAuthGuard)
  async init(
    @Body() dto: InitPaymentDto,
    @CurrentService() service: AuthenticatedService,
  ): Promise<InitPaymentResultDto> {
    try {
      return await this.paymentService.initiateFlouciPayment(
        dto,
        service.application,
      );
    } catch (error) {
      if (error instanceof FlouciError) {
        throw toHttpException(error);
      }
      throw error;
    }
  }

  /**
   * Flouci calls this with POST /payments/providers/flouci/webhook.
   * https://docs.flouci.com/getting-started/payment-step
   *
   * The exact webhook body isn't fully pinned down by Flouci's public docs,
   * so `forbidNonWhitelisted` is relaxed for this one route: unexpected
   * extra fields are stripped rather than rejected outright, since only
   * `payment_id` is actually required to trigger the mandatory
   * verify_payment call. Always acknowledges with 200 once the
   * notification has been durably processed (or safely ignored as a
   * duplicate), so Flouci stops retrying. Real verification always happens
   * server-to-server against Flouci's verify_payment endpoint — the
   * webhook body alone is never trusted.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    payload: FlouciWebhookDto,
  ): Promise<{ received: true }> {
    try {
      await this.paymentService.handleFlouciWebhook(payload.payment_id);
    } catch (error) {
      if (error instanceof FlouciError) {
        this.logger.warn(
          `Webhook processing failed for a Flouci payment_id: ${error.code}`,
        );
        throw toHttpException(error);
      }
      throw error;
    }
    return { received: true };
  }
}
