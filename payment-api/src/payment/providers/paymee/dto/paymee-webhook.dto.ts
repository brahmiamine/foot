import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Body Paymee POSTs to the configured `webhook_url`.
 * https://www.paymee.tn/paymee-integration-with-redirection/
 *
 * A failed payment only carries the minimal documented fields (token,
 * check_sum, payment_status, order_id, amount) — everything else is
 * optional here for that reason, not because it's optional on success.
 */
export class PaymeeWebhookDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  check_sum: string;

  @IsBoolean()
  @Type(() => Boolean)
  payment_status: boolean;

  @IsNotEmpty()
  @IsString()
  order_id: string;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  transaction_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  received_amount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cost?: number;
}
