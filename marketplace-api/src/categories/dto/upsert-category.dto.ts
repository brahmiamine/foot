import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertCategoryDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  parentId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}
