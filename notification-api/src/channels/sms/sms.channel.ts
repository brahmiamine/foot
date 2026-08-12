import { Inject, Injectable } from '@nestjs/common';
import { NotificationChannelType } from '../../common/enums/channel.enum';
import {
  SMS_PROVIDER,
  type SmsProvider,
} from '../../providers/sms/sms-provider.interface';
import { normalizeTunisianPhoneNumber } from '../../common/phone-number';
import type {
  ChannelDeliveryContext,
  NotificationChannel,
} from '../channel.interface';

/**
 * TS-44/TS-45 : reste inactif tant que `SMS_PROVIDER` n'est pas configuré
 * sur `tunisiesms` (voir providers/sms/sms-provider.module.ts) —
 * `NotImplementedSmsProvider` lève alors une erreur explicite, cohérente
 * avec la décision produit documentée dans avancement.md (Epic E14).
 */
@Injectable()
export class SmsChannel implements NotificationChannel {
  readonly type = NotificationChannelType.SMS;

  constructor(@Inject(SMS_PROVIDER) private readonly provider: SmsProvider) {}

  async deliver(context: ChannelDeliveryContext): Promise<void> {
    const { notification, recipient } = context;
    const to = normalizeTunisianPhoneNumber(recipient.phoneNumber);
    if (!to) {
      throw new Error(
        `Recipient ${notification.userId} has no valid Tunisian phone number on file`,
      );
    }

    await this.provider.send({ to, body: notification.body });
  }
}
