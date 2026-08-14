import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Paymee supports two integration modes at initialization time (the
 * create-payment call itself is identical); only what the frontend does
 * with the result differs.
 * https://www.paymee.tn/paymee-integration-with-redirection/
 * https://www.paymee.tn/paymee-integration-without-redirection/
 */
export enum PaymeeIntegrationMode {
  REDIRECT = 'redirect',
  IFRAME = 'iframe',
}

/**
 * Payment initiation payload specific to Paymee. Unlike the generic
 * InitPaymentDto (used by providers where they're optional), Paymee
 * documents first_name/last_name/email/phone as mandatory on every
 * create-payment call.
 */
export class InitPaymeePaymentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  orderId: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  amount: number;

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
  @IsEnum(PaymeeIntegrationMode)
  mode?: PaymeeIntegrationMode = PaymeeIntegrationMode.REDIRECT;

  /**
   * Shared `foot` User.id of the payer, if the caller has one. Enables a
   * PAYMENT_SUCCEEDED notification via notifications once the payment
   * is confirmed — never used for anything else.
   */
  @IsOptional()
  @IsString()
  @MaxLength(36)
  userId?: string;
}
