import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Champs qu'un vendeur peut modifier lui-même sur son propre profil. */
export class UpdateSellerProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;
}
