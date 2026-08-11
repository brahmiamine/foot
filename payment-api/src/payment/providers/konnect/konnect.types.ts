/**
 * Konnect API request/response shapes.
 * Source of truth: https://docs.konnect.network/docs/en/api-integration
 * Only the fields this integration actually uses are declared — do not
 * add speculative fields that aren't documented or observed.
 */

export type KonnectAcceptedPaymentMethod = 'wallet' | 'bank_card' | 'e-DINAR';

export type KonnectToken = 'TND' | 'EUR' | 'USD';

/** POST /payments/init-payment request body. */
export interface KonnectInitPaymentRequest {
  receiverWalletId: string;
  /** Amount in the smallest unit of `token` (millimes for TND). */
  amount: number;
  token?: KonnectToken;
  orderId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  webhook?: string;
  /** Link expiration in minutes. */
  lifespan?: number;
  acceptedPaymentMethods?: KonnectAcceptedPaymentMethod[];
  /** Where the payer's browser is redirected after a successful payment. */
  successUrl?: string;
  /** Where the payer's browser is redirected after a failed/cancelled payment. */
  failUrl?: string;
}

/** POST /payments/init-payment response body. */
export interface KonnectInitPaymentResponse {
  payUrl: string;
  paymentRef: string;
}

/**
 * Status values documented by Konnect for GET /payments/:paymentId.
 * "completed" = payment successful, "pending" = not (yet) successful.
 * Do not add undocumented values here.
 */
export type KonnectPaymentStatus = 'pending' | 'completed';

export interface KonnectTransaction {
  status: string;
}

export interface KonnectPaymentDetails {
  id: string;
  status: KonnectPaymentStatus;
  amountDue: number;
  reachedAmount: number;
  amount: number;
  token: KonnectToken;
  convertedAmount?: number;
  orderId?: string;
  webhook?: string;
  transactions?: KonnectTransaction[];
}

/** GET /payments/:paymentId response body. */
export interface KonnectGetPaymentResponse {
  payment: KonnectPaymentDetails;
}
