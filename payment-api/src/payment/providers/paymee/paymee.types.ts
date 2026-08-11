/**
 * Paymee API request/response shapes.
 * Source of truth:
 * https://www.paymee.tn/paymee-integration-with-redirection/
 * https://www.paymee.tn/paymee-integration-without-redirection/
 * Only the fields this integration actually uses are declared — do not
 * add speculative fields that aren't documented or observed.
 */

/** POST /payments/create request body. */
export interface PaymeeCreatePaymentRequest {
  amount: number;
  note: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  webhook_url: string;
  return_url?: string;
  cancel_url?: string;
  order_id?: string;
}

export interface PaymeeCreatePaymentData {
  token: string;
  order_id: string;
  amount: number;
  payment_url: string;
}

/** POST /payments/create response body. */
export interface PaymeeCreatePaymentResponse {
  status: boolean;
  message: string;
  code: number;
  data: PaymeeCreatePaymentData;
}

/**
 * Body Paymee POSTs to `webhook_url` on a payment status change.
 * `payment_status: false` responses only carry the minimal fields
 * documented for a failed payment (no first_name/last_name/etc).
 */
export interface PaymeeWebhookPayload {
  token: string;
  check_sum: string;
  payment_status: boolean;
  order_id: string;
  amount: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  note?: string;
  transaction_id?: number;
  received_amount?: number;
  cost?: number;
}
