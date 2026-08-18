import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentProviderName } from '../enums/payment-provider.enum';
import { PaymentReconciliationCaseStatus } from '../payment-reconciliation.enums';

export class ListPaymentReconciliationCasesQueryDto {
  @IsOptional()
  @IsEnum(PaymentReconciliationCaseStatus)
  status?: PaymentReconciliationCaseStatus =
    PaymentReconciliationCaseStatus.OPEN;

  @IsOptional()
  @IsEnum(PaymentProviderName)
  provider?: PaymentProviderName;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  consumerApplication?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 200;
}
