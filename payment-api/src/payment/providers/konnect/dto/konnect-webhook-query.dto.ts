import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * Konnect calls the configured webhook URL with a single GET query
 * parameter: payment_ref. See:
 * https://docs.konnect.network/docs/en/api-integration/endpoints/webhook
 */
export class KonnectWebhookQueryDto {
  @IsNotEmpty()
  @IsString()
  // Konnect payment refs are Mongo-style ObjectIds (24 hex chars) in every
  // documented example. Reject anything else early instead of trusting an
  // arbitrary string pulled from an unauthenticated GET request.
  @Matches(/^[a-f0-9]{24}$/i, {
    message: 'payment_ref must be a valid Konnect payment reference',
  })
  payment_ref: string;
}
