/**
 * Minimal contract a payment provider must fulfil. Deliberately small:
 * only what PaymentService actually needs today. Extend it if/when a
 * second provider is added — don't design ahead of that need.
 */
export interface InitiatedPayment {
  payUrl: string;
  providerRef: string;
}

export interface VerifiedPaymentStatus {
  /** Raw status string as returned by the provider, for logs/audit. */
  providerStatus: string;
  isPaid: boolean;
}
