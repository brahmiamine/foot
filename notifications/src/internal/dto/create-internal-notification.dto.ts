import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { NotificationChannelType } from '../../common/enums/channel.enum';
import { NotificationPriority } from '../../common/enums/priority.enum';
import { TargetDto } from '../../notifications/dto/target.dto';

/**
 * Payload de POST /internal/notifications. Un seul mode de destinataire est
 * accepté : `userId`, `target`, ou `email` pour un destinataire externe qui
 * ne possède pas encore de compte plateforme.
 */
export class CreateInternalNotificationDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TargetDto)
  target?: TargetDto;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannelType, { each: true })
  channels?: NotificationChannelType[];

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
