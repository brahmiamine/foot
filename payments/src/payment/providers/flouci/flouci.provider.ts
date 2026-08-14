import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InitiatedPayment } from '../../interfaces/payment-provider.interface';
import { PaymentStatus } from '../../enums/payment-status.enum';
import { flouciConfig } from './flouci.config';
import { FlouciClient } from './flouci.client';
import { FlouciPaymentMismatchError } from './flouci.exceptions';
import {
  ExpectedFlouciPayment,
  FlouciInitPaymentInput,
  assertFlouciPaymentMatchesInternalRecord,
  buildFlouciGeneratePaymentRequest,
  mapFlouciVerification,
} from './flouci.mapper';

export interface FlouciVerifiedPayment {
  providerStatus: string;
  internalStatus: PaymentStatus;
}

export interface FlouciRefundResult {
  providerRefundRef: string;
  providerStatus: string;
}

/**
 * Application-facing entry point for the Flouci integration.
 * Orchestrates the HTTP client and the request/status mapping; this is the
 * only class PaymentService should depend on for Flouci.
 */
@Injectable()
export class FlouciProvider {
  private readonly logger = new Logger(FlouciProvider.name);

  constructor(
    private readonly client: FlouciClient,
    @Inject(flouciConfig.KEY)
    private readonly config: ConfigType<typeof flouciConfig>,
  ) {}

  async initiatePayment(
    input: FlouciInitPaymentInput,
  ): Promise<InitiatedPayment> {
    const request = buildFlouciGeneratePaymentRequest(input, this.config);
    const result = await this.client.generatePayment(request);

    // developer_tracking_id is an opaque field Flouci does not validate —
    // it only ever echoes back what we sent. Confirm it actually did.
    if (result.developer_tracking_id !== input.trackingId) {
      throw new FlouciPaymentMismatchError(
        'developer_tracking_id echoed by Flouci does not match what was sent',
      );
    }

    this.logger.log(`Flouci payment initiated (tracking ${input.trackingId})`);

    return {
      payUrl: result.link,
      providerRef: result.payment_id,
    };
  }

  /**
   * Fetches the authoritative payment status from Flouci and verifies it
   * matches what we expect (developer_tracking_id, amount) before the
   * caller may treat it as PAID. Never rely on a webhook payload alone —
   * and never call this in a loop: Flouci's docs warn against repeated
   * verify_payment calls (rate limiting / IP blocks).
   */
  async verifyPayment(
    providerRef: string,
    expected: ExpectedFlouciPayment,
  ): Promise<FlouciVerifiedPayment> {
    const response = await this.client.verifyPayment(providerRef);

    assertFlouciPaymentMatchesInternalRecord(response.result, expected);

    return {
      providerStatus: response.result.status,
      internalStatus: mapFlouciVerification(response),
    };
  }

  /**
   * TASK-P0-001 (todo.md): only Flouci exposes an automated refund API
   * among the three providers integrated here (verified against
   * https://docs.flouci.com/api-reference/refund-payment — Konnect and
   * Paymee document no equivalent endpoint). RefundService is the only
   * caller and is responsible for routing Konnect/Paymee refunds to
   * MANUAL_REVIEW instead of calling this.
   */
  async refundPayment(providerRef: string): Promise<FlouciRefundResult> {
    const result = await this.client.refundPayment(providerRef);

    this.logger.log(
      `Flouci payment ${providerRef} refunded (refund ${result.refund_id})`,
    );

    return {
      providerRefundRef: result.refund_id,
      providerStatus: result.status,
    };
  }
}
