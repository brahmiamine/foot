import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateRefundApprovalPolicyDto {
  /** Amounts at or below this threshold may be auto-approved. Null disables AUTO. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  autoMaxAmount?: number | null;

  /** Amounts at or above this threshold require two distinct approvals. Null disables DUAL. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  dualApprovalMinAmount?: number | null;

  @IsBoolean()
  makerCheckerEnabled: boolean;
}
