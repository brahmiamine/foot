import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InitiatedPayment } from '../../interfaces/payment-provider.interface';
import { PaymentStatus } from '../../enums/payment-status.enum';
import { konnectConfig } from './konnect.config';
import { KonnectClient } from './konnect.client';
import {
  KonnectInitPaymentInput,
  assertKonnectPaymentMatchesInternalRecord,
  buildKonnectInitPaymentRequest,
  mapKonnectStatus,
} from './konnect.mapper';
import { KonnectPaymentDetails } from './konnect.types';

export interface KonnectVerifiedPayment {
  providerStatus: string;
  internalStatus: PaymentStatus;
  details: KonnectPaymentDetails;
}

export interface KonnectExpectedPayment {
  orderId: string;
  amount: string | number;
  currency: string;
}

/**
 * Application-facing entry point for the Konnect integration.
 * Orchestrates the HTTP client and the request/status mapping; this is the
 * only class PaymentService should depend on for Konnect.
 */
@Injectable()
export class KonnectProvider {
  private readonly logger = new Logger(KonnectProvider.name);

  constructor(
    private readonly client: KonnectClient,
    @Inject(konnectConfig.KEY)
    private readonly config: ConfigType<typeof konnectConfig>,
  ) {}

  async initiatePayment(
    input: KonnectInitPaymentInput,
  ): Promise<InitiatedPayment> {
    const request = buildKonnectInitPaymentRequest(input, this.config);
    const response = await this.client.initPayment(request);

    this.logger.log(`Konnect payment initiated for order ${input.orderId}`);

    return {
      payUrl: response.payUrl,
      providerRef: response.paymentRef,
    };
  }

  /**
   * Fetches the authoritative payment status from Konnect and verifies it
   * matches what we expect (order, amount, currency) before the caller may
   * treat it as PAID. Never rely on a webhook payload alone.
   */
  async verifyPayment(
    providerRef: string,
    expected: KonnectExpectedPayment,
  ): Promise<KonnectVerifiedPayment> {
    const { payment: details } =
      await this.client.getPaymentDetails(providerRef);

    assertKonnectPaymentMatchesInternalRecord(details, expected);

    return {
      providerStatus: details.status,
      internalStatus: mapKonnectStatus(details.status),
      details,
    };
  }
}
