import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** US-23 — informations obligatoires pour expédier une sous-commande. */
export class ShipSellerOrderDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  carrier: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  trackingNumber: string;
}
