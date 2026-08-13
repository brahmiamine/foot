import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body for the operator reconciliation endpoints (POST .../confirm,
 * .../reject) — see RefundController. `resolvedByUser` is mandatory here
 * (unlike CreateRefundDto.initiatedByUser): a manual money movement or a
 * rejection must always be attributable to a named operator.
 */
export class ResolveRefundDto {
  @IsString()
  @MaxLength(100)
  resolvedByUser: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note: string;
}
