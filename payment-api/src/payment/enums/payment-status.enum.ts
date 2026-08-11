/**
 * Internal, provider-agnostic payment status.
 * Providers must map their own status vocabulary onto this enum
 * (see konnect.mapper.ts for the Konnect mapping).
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  UNKNOWN = 'UNKNOWN',
}
