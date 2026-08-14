import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
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
 * Payload de POST /internal/notifications (§20). `application` n'est
 * délibérément pas repris ici : l'identité de l'appelant est celle
 * authentifiée par ServiceAuthGuard (x-api-key), jamais une valeur fournie
 * par le corps de la requête (voir InternalNotificationsController).
 *
 * Un seul destinataire : fournir `userId`. Plusieurs/broadcast : fournir
 * `target` (voir TargetDto, §22). Les deux sont mutuellement exclusifs ;
 * la validation croisée est faite dans NotificationsService.
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
