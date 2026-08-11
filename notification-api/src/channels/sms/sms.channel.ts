import { Inject, Injectable } from '@nestjs/common';
import { NotificationChannelType } from '../../common/enums/channel.enum';
import {
  SMS_PROVIDER,
  type SmsProvider,
} from '../../providers/sms/sms-provider.interface';
import type { NotificationChannel } from '../channel.interface';

/** Hors périmètre V1 (§36) : câblé pour cohérence architecturale, non activable tant qu'aucun SmsProvider réel n'est configuré. */
@Injectable()
export class SmsChannel implements NotificationChannel {
  readonly type = NotificationChannelType.SMS;

  constructor(@Inject(SMS_PROVIDER) private readonly provider: SmsProvider) {}

  deliver(): Promise<void> {
    return this.provider.send({ to: '', body: '' });
  }
}
