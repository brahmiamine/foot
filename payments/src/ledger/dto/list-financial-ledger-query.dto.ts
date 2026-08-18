import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { FinancialLedgerComponent } from '../financial-ledger.enums';

export class ListFinancialLedgerQueryDto {
  @IsOptional()
  @IsEnum(FinancialLedgerComponent)
  component?: FinancialLedgerComponent;

  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @IsOptional()
  @IsUUID()
  refundId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceApplication?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 200;
}
