import { PaymentStatus } from '../../enums/payment-status.enum';
import { FlouciConfig } from './flouci.config';
import {
  FlouciInvalidAmountError,
  FlouciPaymentMismatchError,
} from './flouci.exceptions';
import {
  FlouciGeneratePaymentRequest,
  FlouciVerifyPaymentResponse,
} from './flouci.types';

const DEFAULT_ACCEPT_CARD = true;

/**
 * Converts a TND amount (up to 3 decimal places) to millimes.
 *
 * Uses string-based fixed-point arithmetic instead of `amount * 1000` so the
 * result is deterministic and immune to binary floating-point rounding
 * (e.g. 25.500 must always become exactly 25500, never 25499 or 25500.0000001).
 */
export function tndToMillimes(amount: number | string): number {
  const normalized =
    typeof amount === 'number' ? amount.toFixed(3) : amount.trim();
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(normalized);

  if (!match) {
    throw new FlouciInvalidAmountError(`"${amount}" is not a valid TND amount`);
  }

  const [, wholePart, decimalPart = ''] = match;
  const millimesString = `${wholePart}${decimalPart.padEnd(3, '0')}`;
  const millimes = BigInt(millimesString);

  if (millimes <= 0n) {
    throw new FlouciInvalidAmountError('amount must be strictly positive');
  }
  if (millimes > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new FlouciInvalidAmountError('amount is too large');
  }

  return Number(millimes);
}

/** Inverse of {@link tndToMillimes}, for comparisons/logging. */
export function millimesToTnd(millimes: number): string {
  const value = BigInt(Math.trunc(millimes));
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / 1000n;
  const decimal = (abs % 1000n).toString().padStart(3, '0');
  return `${negative ? '-' : ''}${whole}.${decimal}`;
}

export interface FlouciInitPaymentInput {
  /** Correlation id sent as developer_tracking_id — our internal Payment.id, not the orderId. */
  trackingId: string;
  /** TND amount, e.g. 25.5 */
  amount: number | string;
  /** Optional customer reference, mapped to Flouci's client_id when available. */
  clientId?: string;
}

/**
 * Builds the Flouci generate-payment request by explicitly whitelisting the
 * fields Flouci expects. Never spread internal payment data into this
 * payload — add fields here one by one, deliberately.
 */
export function buildFlouciGeneratePaymentRequest(
  input: FlouciInitPaymentInput,
  config: FlouciConfig,
): FlouciGeneratePaymentRequest {
  return {
    amount: tndToMillimes(input.amount),
    developer_tracking_id: input.trackingId,
    accept_card: DEFAULT_ACCEPT_CARD,
    success_link: config.successUrl,
    fail_link: config.failUrl,
    webhook: config.webhookUrl,
    ...(input.clientId ? { client_id: input.clientId } : {}),
  };
}

/**
 * Maps Flouci's documented verify_payment status to our internal,
 * provider-agnostic status. Only SUCCESS/PENDING/EXPIRED/FAILURE are
 * documented by Flouci; anything else is surfaced as UNKNOWN rather than
 * guessed at.
 * https://docs.flouci.com/api-reference/verify-transaction
 */
export function mapFlouciStatus(status: string): PaymentStatus {
  switch (status) {
    case 'SUCCESS':
      return PaymentStatus.PAID;
    case 'PENDING':
      return PaymentStatus.PENDING;
    case 'EXPIRED':
      return PaymentStatus.EXPIRED;
    case 'FAILURE':
      return PaymentStatus.FAILED;
    default:
      return PaymentStatus.UNKNOWN;
  }
}

/**
 * Flouci's docs require BOTH `response.success === true` AND
 * `response.result.status === 'SUCCESS'` before a payment may be
 * considered paid. A "SUCCESS" status alongside `success !== true` is a
 * contradictory/invalid response and must never be trusted as PAID.
 */
export function mapFlouciVerification(
  response: FlouciVerifyPaymentResponse,
): PaymentStatus {
  if (response.result.status === 'SUCCESS') {
    return response.success === true
      ? PaymentStatus.PAID
      : PaymentStatus.UNKNOWN;
  }
  return mapFlouciStatus(response.result.status);
}

export interface ExpectedFlouciPayment {
  trackingId: string;
  amount: string | number;
}

/**
 * Defence in depth: a webhook (or even a "SUCCESS" status) is never enough
 * on its own. Before accepting a Flouci payment as PAID, verify the
 * developer_tracking_id and amount Flouci returns actually match what we
 * initiated.
 */
export function assertFlouciPaymentMatchesInternalRecord(
  result: { developer_tracking_id: string; amount: number },
  payment: ExpectedFlouciPayment,
): void {
  if (result.developer_tracking_id !== payment.trackingId) {
    throw new FlouciPaymentMismatchError(
      `developer_tracking_id mismatch (expected ${payment.trackingId}, got ${result.developer_tracking_id})`,
    );
  }

  const expectedMillimes = tndToMillimes(payment.amount);
  if (result.amount !== expectedMillimes) {
    throw new FlouciPaymentMismatchError(
      `amount mismatch (expected ${expectedMillimes} millimes, got ${result.amount})`,
    );
  }
}
