import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsString,
  ValidateNested,
} from 'class-validator';
import { NotificationChannelType } from '../../common/enums/channel.enum';

export class PreferenceEntryDto {
  @IsString()
  category!: string;

  @IsEnum(NotificationChannelType)
  channel!: NotificationChannelType;

  @IsBoolean()
  enabled!: boolean;
}

export class UpsertPreferencesDto {
  @ValidateNested({ each: true })
  @Type(() => PreferenceEntryDto)
  @ArrayMinSize(1)
  preferences!: PreferenceEntryDto[];
}
