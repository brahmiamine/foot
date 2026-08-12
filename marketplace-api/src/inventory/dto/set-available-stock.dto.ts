import { IsInt, Min } from 'class-validator';

export class SetAvailableStockDto {
  @IsInt()
  @Min(0)
  available: number;
}
