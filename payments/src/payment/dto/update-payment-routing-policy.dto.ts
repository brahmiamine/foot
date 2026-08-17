import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { PaymentProviderName } from '../enums/payment-provider.enum';

export class UpdatePaymentRoutingPolicyDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(PaymentProviderName, { each: true })
  enabledProviders: PaymentProviderName[];

  @IsEnum(PaymentProviderName)
  defaultProvider: PaymentProviderName;

  @IsOptional()
  @IsEnum(PaymentProviderName)
  fallbackProvider?: PaymentProviderName | null;
}
