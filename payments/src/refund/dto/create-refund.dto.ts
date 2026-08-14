import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Request to refund a payment, in full or in part. `amount` is optional —
 * omitting it refunds whatever remains refundable at request time (computed
 * server-side, never trusted from a previous client-side total).
 */
export class CreateRefundDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  amount?: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;

  /**
   * Identity of the operator/user who requested the refund, when the
   * caller application has one (e.g. a support agent in federation-hub). Purely
   * for audit — never used for authorization, which stays at the
   * ServiceAuthGuard/application level.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  initiatedByUser?: string;
}
