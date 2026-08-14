import { IsEnum } from 'class-validator';
import { NotificationLocale } from '../../common/enums/locale.enum';

export class SetLocaleDto {
  @IsEnum(NotificationLocale)
  locale!: NotificationLocale;
}
