/**
 * Lifecycle of a single refund operation against a Payment. A Payment can
 * have several Refund rows (partial refunds); the remaining refundable amount
 * is always computed server-side from statuses that reserve money.
 */
export enum RefundStatus {
  /** Created and ready for the provider/manual-review routing decision. */
  REQUESTED = 'REQUESTED',
  /** Governance approval is still required before any provider dispatch. */
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  /** A provider call is in flight (automated refund only — Flouci today). */
  PROCESSING = 'PROCESSING',
  /** Money confirmed returned to the payer, automatically or by an operator. */
  SUCCEEDED = 'SUCCEEDED',
  /** Provider rejected the refund, or an operator rejected it. Terminal. */
  FAILED = 'FAILED',
  /**
   * The provider does not expose a compatible automated refund API or an
   * automated attempt needs human handling. This status is reached only after
   * any configured governance approval has completed.
   */
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

/** Refunds in these statuses still hold a claim on the payment's amount. */
export const RESERVING_REFUND_STATUSES: readonly RefundStatus[] = [
  RefundStatus.REQUESTED,
  RefundStatus.AWAITING_APPROVAL,
  RefundStatus.PROCESSING,
  RefundStatus.SUCCEEDED,
  RefundStatus.MANUAL_REVIEW,
];
