/**
 * Flouci API request/response shapes.
 * Source of truth:
 * https://docs.flouci.com/api-reference/generate-transaction
 * https://docs.flouci.com/api-reference/verify-transaction
 * Only the fields this integration actually uses are declared — do not
 * add speculative fields that aren't documented or observed.
 */

/** POST /api/v2/generate_payment request body. */
export interface FlouciGeneratePaymentRequest {
  /** TND amount in millimes, e.g. 25.500 TND -> 25500. */
  amount: number;
  developer_tracking_id: string;
  accept_card: boolean;
  success_link: string;
  fail_link: string;
  webhook: string;
  client_id?: string;
}

export interface FlouciGeneratePaymentResultData {
  success: boolean;
  payment_id: string;
  link: string;
  developer_tracking_id: string;
}

/** POST /api/v2/generate_payment response body. */
export interface FlouciGeneratePaymentResponse {
  result: FlouciGeneratePaymentResultData;
}

/**
 * Statuses documented for GET /api/v2/verify_payment/{payment_id}.
 * Do not add undocumented values here.
 */
export type FlouciPaymentStatus = 'SUCCESS' | 'PENDING' | 'EXPIRED' | 'FAILURE';

export interface FlouciVerifyPaymentResult {
  type?: string;
  amount: number;
  status: FlouciPaymentStatus;
  developer_tracking_id: string;
}

/** GET /api/v2/verify_payment/{payment_id} response body. */
export interface FlouciVerifyPaymentResponse {
  success: boolean;
  result: FlouciVerifyPaymentResult;
}

/**
 * POST /api/v2/refund_payment request body.
 * Source of truth: https://docs.flouci.com/api-reference/refund-payment
 * Flouci's refund endpoint only takes the payment_id — it refunds the full
 * amount of that payment; there is no documented partial-refund parameter.
 */
export interface FlouciRefundPaymentRequest {
  payment_id: string;
}

export interface FlouciRefundPaymentResult {
  refund_id: string;
  payment_id: string;
  amount: string;
  status: string;
  refunded_at: string;
}

/** POST /api/v2/refund_payment response body. */
export interface FlouciRefundPaymentResponse {
  result: FlouciRefundPaymentResult;
  status: string;
}
