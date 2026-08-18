import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaymentAllocationComponent } from '../financial-ledger.enums';

export class PaymentFinancialAllocationLineDto {
  @IsEnum(PaymentAllocationComponent)
  component: PaymentAllocationComponent;

  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  amount: number;

  @ValidateIf(
    (line: PaymentFinancialAllocationLineDto) =>
      line.component !== PaymentAllocationComponent.PLATFORM_FEE,
  )
  @IsString()
  @MaxLength(191)
  beneficiaryId?: string;

  @IsString()
  @MaxLength(191)
  reference: string;
}

export class RegisterPaymentFinancialAllocationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PaymentFinancialAllocationLineDto)
  entries: PaymentFinancialAllocationLineDto[];
}
