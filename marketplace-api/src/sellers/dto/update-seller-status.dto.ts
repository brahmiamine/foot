import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SellerStatus } from '../enums/seller-status.enum';

/** Décision du club sur le compte vendeur — jamais déclenchable par le vendeur lui-même. */
export class UpdateSellerStatusDto {
  @IsEnum(SellerStatus)
  status: SellerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
