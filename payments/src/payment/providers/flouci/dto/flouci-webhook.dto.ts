import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsNotEmpty } from 'class-validator';

/**
 * Body Flouci POSTs to our webhook endpoint. Flouci's public docs don't
 * pin down the exact webhook schema (unlike generate_payment/verify_payment),
 * so only `payment_id` is required here — the one field actually needed to
 * trigger the mandatory verify_payment call. Everything else is optional
 * and never trusted on its own: real status/amount always come from a
 * fresh verify_payment response, never from this payload.
 */
export class FlouciWebhookDto {
  @IsNotEmpty()
  @IsString()
  payment_id: string;

  @IsOptional()
  @IsString()
  developer_tracking_id?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;
}
