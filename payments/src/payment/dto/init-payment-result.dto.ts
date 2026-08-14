/**
 * What the application service returns after successfully initiating a
 * payment with a provider. Only what the frontend needs to redirect the
 * payer — never provider credentials or raw provider payloads.
 */
export class InitPaymentResultDto {
  paymentId: string;
  payUrl: string;
  providerRef: string;
}
