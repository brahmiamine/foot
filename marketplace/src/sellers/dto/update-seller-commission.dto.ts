import { IsNumber, Max, Min } from 'class-validator';

export class UpdateSellerCommissionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionRate: number;
}
