import { IsInt, Min } from 'class-validator';

/** `quantity: 0` retire la ligne — voir CartService.updateItemQuantity. */
export class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  quantity: number;
}
