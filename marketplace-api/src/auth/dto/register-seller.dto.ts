import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Inscription publique d'un vendeur. Le compte est créé PENDING : voir
 * ModerationModule pour l'activation par l'administration du club.
 * `clubId` référence logiquement `teams.id` de la base partagée `foot` —
 * marketplace-api n'a pas accès à cette base (voir database.config.ts),
 * donc pas de validation FK ici, comme pour sellerPortal aujourd'hui.
 */
export class RegisterSellerDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(36)
  clubId: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  businessName: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  ownerName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

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
  @MaxLength(120)
  activityCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  taxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tradeRegister?: string;
}
