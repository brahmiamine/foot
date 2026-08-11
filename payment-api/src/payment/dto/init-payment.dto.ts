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
}
