import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertEscalationPolicyDto {
  @IsOptional()
  @IsString()
  category?: string | null;

  @IsBoolean()
  enabled!: boolean;

  @IsInt()
  @Min(1)
  delayMinutes!: number;

  @IsOptional()
  @IsString()
  backupUserId?: string | null;

  @IsOptional()
  @IsString()
  backupRole?: string | null;

  @IsString()
  @MinLength(3)
  reason!: string;
}
