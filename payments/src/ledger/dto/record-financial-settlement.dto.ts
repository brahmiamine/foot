import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { FinancialBeneficiaryType } from '../financial-ledger.enums';

export class RecordFinancialSettlementDto {
  @IsString()
  @MaxLength(191)
  settlementId: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsIn(['TND'])
  currency?: string = 'TND';

  @IsEnum(FinancialBeneficiaryType)
  beneficiaryType: FinancialBeneficiaryType;

  @ValidateIf(
    (dto: RecordFinancialSettlementDto) =>
      dto.beneficiaryType === FinancialBeneficiaryType.CLUB ||
      dto.beneficiaryType === FinancialBeneficiaryType.SELLER,
  )
  @IsString()
  @MaxLength(191)
  beneficiaryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  reference?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
