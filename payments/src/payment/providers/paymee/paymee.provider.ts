import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PaymentStatus } from '../../enums/payment-status.enum';
import { verifyPaymeeChecksum } from './paymee.checksum';
import { paymeeConfig } from './paymee.config';
import { PaymeeClient } from './paymee.client';
import { PaymeeChecksumInvalidError } from './paymee.exceptions';
import {
  ExpectedPaymeePayment,
  PaymeeInitPaymentInput,
  assertPaymeeWebhookMatchesInternalRecord,
  buildPaymeeCreatePaymentRequest,
  formatPaymeeAmount,
  mapPaymeeStatus,
} from './paymee.mapper';
import { PaymeeWebhookPayload } from './paymee.types';

export interface InitiatedPaymeePayment {
  /** External Paymee reference, stored as the internal payment's providerRef. */
  token: string;
  /** Always present (the create-payment endpoint is common to both modes) but only meaningful for the redirection flow. */
  payUrl: string;
}

export interface PaymeeVerifiedPayment {
  internalStatus: PaymentStatus;
  /** Raw status string as returned by Paymee, for logs/audit. */
  providerStatus: string;
  receivedAmount?: string;
  fee?: string;
}

/**
 * Application-facing entry point for the Paymee integration.
 * Orchestrates the HTTP client, checksum verification and request/status
 * mapping; this is the only class PaymentService should depend on for
 * Paymee.
 */
@Injectable()
export class PaymeeProvider {
  private readonly logger = new Logger(PaymeeProvider.name);

  constructor(
    private readonly client: PaymeeClient,
    @Inject(paymeeConfig.KEY)
    private readonly config: ConfigType<typeof paymeeConfig>,
  ) {}

  async initiatePayment(
    input: PaymeeInitPaymentInput,
  ): Promise<InitiatedPaymeePayment> {
    const request = buildPaymeeCreatePaymentRequest(input, this.config);
    const data = await this.client.createPayment(request);

    this.logger.log(`Paymee payment initiated for order ${input.orderId}`);

    return {
      token: data.token,
      payUrl: data.payment_url,
    };
  }

  /**
   * Steps 3-4 of the mandatory webhook processing order: recompute the
   * check_sum and compare it, *before* any internal payment lookup happens.
   * Never call the rest of the webhook flow if this throws.
   */
  verifyChecksum(
    token: string,
    paymentStatus: boolean,
    checksum: string,
  ): void {
    if (
      !verifyPaymeeChecksum(token, paymentStatus, this.config.apiKey, checksum)
    ) {
      throw new PaymeeChecksumInvalidError();
    }
  }

  /**
   * Steps 6-8: verify the order_id/amount carried by an already
   * checksum-verified webhook against our internal record, then map its
   * status. Only call once the internal payment has been located.
   */
  verifyPayment(
    payload: PaymeeWebhookPayload,
    expected: ExpectedPaymeePayment,
  ): PaymeeVerifiedPayment {
    assertPaymeeWebhookMatchesInternalRecord(payload, expected);

    return {
      internalStatus: mapPaymeeStatus(payload.payment_status),
      providerStatus: payload.payment_status ? 'true' : 'false',
      receivedAmount:
        payload.received_amount !== undefined
          ? formatPaymeeAmount(payload.received_amount)
          : undefined,
      fee:
        payload.cost !== undefined
          ? formatPaymeeAmount(payload.cost)
          : undefined,
    };
  }
}
