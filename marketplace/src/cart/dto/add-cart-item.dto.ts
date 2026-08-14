import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}
