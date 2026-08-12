import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** US-50 — demande de retour initiée par le client. */
export class RequestReturnDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  sellerOrderId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  sellerOrderItemId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  customerName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  reason: string;
}
