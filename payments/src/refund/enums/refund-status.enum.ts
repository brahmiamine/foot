/**
 * TASK-P0-001 (todo.md): lifecycle of a single refund operation against a
 * Payment. A Payment can have several Refund rows (partial refunds); the
 * remaining refundable amount is always computed server-side from the sum
 * of non-FAILED refunds — see RefundService.getRemainingRefundableAmount.
 */
export enum RefundStatus {
  /** Created, not yet dispatched to a provider (or to manual review). */
  REQUESTED = 'REQUESTED',
  /** A provider call is in flight (automated refund only — Flouci today). */
  PROCESSING = 'PROCESSING',
  /** Money confirmed returned to the payer, automatically or by an operator. */
  SUCCEEDED = 'SUCCEEDED',
  /** Provider rejected the refund, or an operator rejected a manual one. Terminal. */
  FAILED = 'FAILED',
  /**
   * The provider does not expose a refund API (Konnect, Paymee today) or an
   * automated attempt needs human handling — never silently reported as
   * SUCCEEDED. Resolved by an operator via RefundService.confirmManualRefund
   * / rejectManualRefund.
   */
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

/** Refunds in these statuses still hold a claim on the payment's amount. */
export const RESERVING_REFUND_STATUSES: readonly RefundStatus[] = [
  RefundStatus.REQUESTED,
  RefundStatus.PROCESSING,
  RefundStatus.SUCCEEDED,
  RefundStatus.MANUAL_REVIEW,
];
