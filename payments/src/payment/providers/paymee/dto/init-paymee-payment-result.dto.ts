/**
 * What the application service returns after successfully initiating a
 * Paymee payment. Only what the frontend needs — never the API key or raw
 * Paymee response.
 *
 * `token` is what the frontend needs to load the Paymee gateway in an
 * iframe (without-redirection mode). `payUrl` is only included when the
 * redirection mode was used.
 */
export class InitPaymeePaymentResultDto {
  paymentId: string;
  token: string;
  payUrl?: string;
}
