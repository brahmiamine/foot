import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * HTTP body for operator refund decisions. The authenticated operator identity
 * comes exclusively from the trusted x-operator-user-id header. The legacy
 * resolvedByUser body field remains accepted only for backward compatibility
 * and is ignored by controllers when constructing the service command.
 */
export class OperatorRefundDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  resolvedByUser?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note: string;
}
