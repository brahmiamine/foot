import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentProviderName } from '../enums/payment-provider.enum';

/**
 * Provider-agnostic payment request carrying the superset required by every
 * currently supported PSP. This is intentionally independent from
 * InitPaymentDto because that DTO makes payer identity fields optional for
 * Konnect/Flouci, while Paymee requires them. Inheriting @IsOptional metadata
 * here would make policy-based routing unsafe.
 */
export class RoutedInitPaymentDto {
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

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  phoneNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  userId?: string;

  /**
   * Optional caller preference. If it is disabled by policy, the configured
   * fallback is selected before any provider call. No fallback is attempted
   * after an ambiguous PSP/network failure because that could double charge.
   */
  @IsOptional()
  @IsEnum(PaymentProviderName)
  preferredProvider?: PaymentProviderName;
}
