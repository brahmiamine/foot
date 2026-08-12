import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(220)
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  brand?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  sku: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  price: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  compareAtPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  weightKg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  dimensions?: string;
}
