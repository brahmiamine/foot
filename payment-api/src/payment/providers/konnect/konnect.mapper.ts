import { PaymentStatus } from '../../enums/payment-status.enum';
import { KonnectConfig } from './konnect.config';
import {
  KonnectInvalidAmountError,
  KonnectPaymentMismatchError,
} from './konnect.exceptions';
import {
  KonnectAcceptedPaymentMethod,
  KonnectInitPaymentRequest,
  KonnectPaymentDetails,
} from './konnect.types';

/** Payment link validity, in minutes, if the payer never returns. */
const DEFAULT_LIFESPAN_MINUTES = 30;

const DEFAULT_ACCEPTED_PAYMENT_METHODS: KonnectAcceptedPaymentMethod[] = [
  'bank_card',
  'wallet',
  'e-DINAR',
];

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
    throw new KonnectInvalidAmountError(
      `"${amount}" is not a valid TND amount`,
    );
  }

  const [, wholePart, decimalPart = ''] = match;
  const millimesString = `${wholePart}${decimalPart.padEnd(3, '0')}`;
  const millimes = BigInt(millimesString);

  if (millimes <= 0n) {
    throw new KonnectInvalidAmountError('amount must be strictly positive');
  }
  if (millimes > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new KonnectInvalidAmountError('amount is too large');
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

export interface KonnectInitPaymentInput {
  orderId: string;
  /** TND amount, e.g. 25.5 */
  amount: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
}

/**
 * Builds the Konnect init-payment request by explicitly whitelisting the
 * fields Konnect expects. Never spread internal payment data into this
 * payload — add fields here one by one, deliberately.
 */
export function buildKonnectInitPaymentRequest(
  input: KonnectInitPaymentInput,
  config: KonnectConfig,
): KonnectInitPaymentRequest {
  return {
    receiverWalletId: config.walletId,
    amount: tndToMillimes(input.amount),
    token: 'TND',
    orderId: input.orderId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phoneNumber: input.phoneNumber,
    webhook: config.webhookUrl,
    lifespan: DEFAULT_LIFESPAN_MINUTES,
    acceptedPaymentMethods: DEFAULT_ACCEPTED_PAYMENT_METHODS,
  };
}

/**
 * Maps Konnect's documented payment status to our internal, provider-agnostic
 * status. Only "completed" and "pending" are documented by Konnect; anything
 * else is surfaced as UNKNOWN rather than guessed at.
 * https://docs.konnect.network/docs/en/api-integration/endpoints/get-payment-details
 */
export function mapKonnectStatus(status: string): PaymentStatus {
  switch (status) {
    case 'completed':
      return PaymentStatus.PAID;
    case 'pending':
      return PaymentStatus.PENDING;
    default:
      return PaymentStatus.UNKNOWN;
  }
}

export interface ExpectedKonnectPayment {
  amount: string | number;
  currency: string;
  orderId: string;
}

/**
 * Defence in depth: a webhook (or even a completed status) is never enough
 * on its own. Before accepting a Konnect payment as PAID, verify the details
 * Konnect returns actually match what we initiated.
 */
export function assertKonnectPaymentMatchesInternalRecord(
  details: KonnectPaymentDetails,
  payment: ExpectedKonnectPayment,
): void {
  if (details.orderId && details.orderId !== payment.orderId) {
    throw new KonnectPaymentMismatchError(
      `orderId mismatch (expected ${payment.orderId}, got ${details.orderId})`,
    );
  }

  if (details.token !== payment.currency) {
    throw new KonnectPaymentMismatchError(
      `currency mismatch (expected ${payment.currency}, got ${details.token})`,
    );
  }

  const expectedMillimes = tndToMillimes(payment.amount);
  if (details.amount !== expectedMillimes) {
    throw new KonnectPaymentMismatchError(
      `amount mismatch (expected ${expectedMillimes} millimes, got ${details.amount})`,
    );
  }
}
