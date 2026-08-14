import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Application-level request to initiate a payment.
 * Provider-specific mapping (e.g. TND -> millimes, Konnect field names)
 * happens in the provider layer, never here.
 */
export class InitPaymentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  orderId: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsIn(['TND'])
  currency?: string = 'TND';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  /**
   * Shared `foot` User.id of the payer, if the caller has one (a payment
   * can be initiated for a guest/anonymous checkout without it). Enables
   * a PAYMENT_SUCCEEDED notification via notifications once the
   * payment is confirmed — never used for anything else.
   */
  @IsOptional()
  @IsString()
  @MaxLength(36)
  userId?: string;
}
