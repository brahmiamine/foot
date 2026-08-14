import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpsertVariantDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  sku: string;

  @IsObject()
  attributes: Record<string, string>;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  price?: number;
}
