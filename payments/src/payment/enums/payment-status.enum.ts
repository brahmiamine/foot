/**
 * Internal, provider-agnostic payment status.
 * Providers must map their own status vocabulary onto this enum
 * (see konnect.mapper.ts / paymee.mapper.ts / flouci.mapper.ts for the
 * per-provider mapping).
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  /** Flouci: the hosted payment session expired before completion. */
  EXPIRED = 'EXPIRED',
  UNKNOWN = 'UNKNOWN',
}
