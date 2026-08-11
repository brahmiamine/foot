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
