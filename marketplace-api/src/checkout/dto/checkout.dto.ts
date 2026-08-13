import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckoutDto {
  @IsString()
  @MaxLength(191)
  customerName: string;

  @IsEmail()
  customerEmail: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  customerPhone?: string;

  @IsString()
  @MaxLength(500)
  shippingAddress: string;

  /** Requis par le DTO Paymee côté payment-api si PAYMENT_PROVIDER=paymee — voir CheckoutService. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;
}
