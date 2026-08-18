import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { DigestMode } from '../../common/enums/digest-mode.enum';

const HM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class SetScheduleDto {
  @IsString()
  timezone!: string;

  @IsOptional()
  @Matches(HM_PATTERN, { message: 'quietHoursStart must be HH:mm' })
  quietHoursStart?: string | null;

  @IsOptional()
  @Matches(HM_PATTERN, { message: 'quietHoursEnd must be HH:mm' })
  quietHoursEnd?: string | null;

  @IsEnum(DigestMode)
  digestMode!: DigestMode;
}
