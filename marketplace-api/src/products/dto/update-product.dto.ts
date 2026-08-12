import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Modification d'un produit existant — champs tous optionnels, seuls les
 * champs fournis sont mis à jour. `| null` sur les champs qui l'acceptent
 * (mêmes règles que sellerPortal/src/app/api/products/[id]/route.ts) permet
 * au vendeur de les effacer explicitement ; `@IsOptional()` de class-validator
 * laisse passer `null` sans le rejeter, contrairement à `undefined` qui
 * signifie simplement "champ non fourni, ne pas y toucher" (voir
 * ProductsService.update).
 */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(191)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  brand?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sku?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  compareAtPrice?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  weightKg?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  dimensions?: string | null;
}
