import { IsInt, Max, Min } from 'class-validator';

export class UpdateRefundManualReviewPolicyDto {
  @IsInt()
  @Min(5)
  @Max(10080)
  slaMinutes: number;

  @IsInt()
  @Min(0)
  @Max(10079)
  reminderBeforeDueMinutes: number;

  @IsInt()
  @Min(0)
  @Max(10080)
  escalationAfterDueMinutes: number;
}
