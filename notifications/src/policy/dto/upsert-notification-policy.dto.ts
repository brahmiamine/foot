import {
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ChannelPolicyMode } from '../../common/enums/channel-policy-mode.enum';
import { NotificationChannelType } from '../../common/enums/channel.enum';

export class UpsertNotificationPolicyDto {
  @IsOptional()
  @IsString()
  category?: string | null;

  @IsObject()
  channels!: Partial<Record<NotificationChannelType, ChannelPolicyMode>>;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @IsString()
  @MinLength(3)
  reason!: string;
}
