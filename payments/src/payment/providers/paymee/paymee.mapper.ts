import { PaymentStatus } from '../../enums/payment-status.enum';
import { PaymeeConfig } from './paymee.config';
import {
  PaymeeInvalidAmountError,
  PaymeePaymentMismatchError,
} from './paymee.exceptions';
import {
  PaymeeCreatePaymentRequest,
  PaymeeWebhookPayload,
} from './paymee.types';

/**
 * Converts a TND amount (up to 3 decimal places, our internal precision) to
 * an integer number of cents (2 decimal places, Paymee's documented
 * precision — e.g. 220.25). Uses string/BigInt arithmetic instead of
 * float multiplication so the result is deterministic and immune to binary
 * floating-point rounding.
 */
export function tndToPaymeeCents(amount: number | string): bigint {
  const normalized =
    typeof amount === 'number' ? amount.toFixed(3) : amount.trim();
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(normalized);

  if (!match) {
    throw new PaymeeInvalidAmountError(`"${amount}" is not a valid TND amount`);
  }

  const [, wholePart, decimalPart = ''] = match;
  const millimes = BigInt(`${wholePart}${decimalPart.padEnd(3, '0')}`);

  if (millimes <= 0n) {
    throw new PaymeeInvalidAmountError('amount must be strictly positive');
  }

  // Round the 3rd decimal (millimes) to 2 decimals (cents), half up.
  const cents = (millimes + 5n) / 10n;

  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new PaymeeInvalidAmountError('amount is too large');
  }

  return cents;
}

/** Formats a cents amount as the "X.YY" decimal string Paymee documents. */
export function paymeeCentsToDecimalString(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = abs / 100n;
  const decimal = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${decimal}`;
}

/** TND amount -> Paymee's decimal string representation, e.g. "220.25". */
export function formatPaymeeAmount(amount: number | string): string {
  return paymeeCentsToDecimalString(tndToPaymeeCents(amount));
}

/**
 * TND amount -> the JSON number Paymee's API expects. Only converts to a
 * float at the very last moment, right before building the HTTP payload —
 * every comparison/business-logic step upstream stays on cents (BigInt) or
 * the controlled decimal string.
 */
export function tndToPaymeeAmount(amount: number | string): number {
  return Number(formatPaymeeAmount(amount));
}

export interface PaymeeInitPaymentInput {
  orderId: string;
  /** TND amount, e.g. 220.25 */
  amount: number | string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

/**
 * Builds the Paymee create-payment request by explicitly whitelisting the
 * fields Paymee expects. Never spread internal payment data into this
 * payload — add fields here one by one, deliberately.
 */
export function buildPaymeeCreatePaymentRequest(
  input: PaymeeInitPaymentInput,
  config: PaymeeConfig,
): PaymeeCreatePaymentRequest {
  return {
    amount: tndToPaymeeAmount(input.amount),
    note: `Order #${input.orderId}`,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phoneNumber,
    webhook_url: config.webhookUrl,
    return_url: config.returnUrl,
    cancel_url: config.cancelUrl,
    order_id: input.orderId,
  };
}

/**
 * Maps Paymee's documented `payment_status` boolean to our internal,
 * provider-agnostic status. true -> PAID, false -> FAILED; nothing else is
 * documented by Paymee for this field.
 */
export function mapPaymeeStatus(paymentStatus: boolean): PaymentStatus {
  return paymentStatus ? PaymentStatus.PAID : PaymentStatus.FAILED;
}

export interface ExpectedPaymeePayment {
  orderId: string;
  amount: string | number;
}

/**
 * Defence in depth: a webhook is never enough on its own, even once its
 * check_sum is valid. Before accepting a Paymee payment as PAID/FAILED,
 * verify the order_id and amount it carries actually match what we
 * initiated internally.
 */
export function assertPaymeeWebhookMatchesInternalRecord(
  payload: PaymeeWebhookPayload,
  payment: ExpectedPaymeePayment,
): void {
  if (payload.order_id && payload.order_id !== payment.orderId) {
    throw new PaymeePaymentMismatchError(
      `order_id mismatch (expected ${payment.orderId}, got ${payload.order_id})`,
    );
  }

  const expectedCents = tndToPaymeeCents(payment.amount);
  const receivedCents = tndToPaymeeCents(payload.amount);
  if (expectedCents !== receivedCents) {
    throw new PaymeePaymentMismatchError(
      `amount mismatch (expected ${paymeeCentsToDecimalString(expectedCents)}, got ${paymeeCentsToDecimalString(receivedCents)})`,
    );
  }
}
