import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { InitPaymentDto } from './init-payment.dto';
import { PaymentProviderName } from '../enums/payment-provider.enum';

/**
 * Generic routing requests carry the superset required by every currently
 * supported PSP so the router can safely select another enabled provider
 * before any external payment creation call is made.
 */
export class RoutedInitPaymentDto extends InitPaymentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  declare firstName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  declare lastName: string;

  @IsNotEmpty()
  @IsEmail()
  declare email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  declare phoneNumber: string;

  /**
   * Optional caller preference. If it is disabled by policy, the configured
   * fallback is selected before any provider call. No fallback is attempted
   * after an ambiguous PSP/network failure because that could double charge.
   */
  @IsOptional()
  @IsEnum(PaymentProviderName)
  preferredProvider?: PaymentProviderName;
}
