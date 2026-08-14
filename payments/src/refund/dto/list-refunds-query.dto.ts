import { IsEnum, IsOptional } from 'class-validator';
import { RefundStatus } from '../enums/refund-status.enum';

export class ListRefundsQueryDto {
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;
}
