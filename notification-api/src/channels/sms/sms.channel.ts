import { Inject, Injectable } from '@nestjs/common';
import { NotificationChannelType } from '../../common/enums/channel.enum';
import {
  SMS_PROVIDER,
  type SmsProvider,
} from '../../providers/sms/sms-provider.interface';
import type {
  ChannelDeliveryContext,
  ChannelDeliveryResult,
  NotificationChannel,
} from '../channel.interface';

/**
 * Destinataire : `notification.data.phone` (convention actuelle — la table
 * `User` de la base partagée `foot` n'a pas de colonne téléphone ; une
 * application qui veut du SMS doit inclure `data.phone` — et optionnellement
 * `data.smsSender` pour un expéditeur personnalisé — dans son appel à
 * `POST /internal/notifications`). Un annuaire téléphone dédié pourra
 * remplacer cette convention plus tard sans changer SmsProvider.
 *
 * `deliveryConfirmationRequired = true` : TunisieSMS distingue explicitement
 * "accepté par la plateforme" (status_code 200) de "livré au téléphone"
 * (DLR, non branché ici) — voir tunisiesms.provider.ts. Le worker ne doit
 * donc jamais marquer la delivery DELIVERED automatiquement pour ce canal
 * (voir BaseChannelProcessor).
 */
@Injectable()
export class SmsChannel implements NotificationChannel {
  readonly type = NotificationChannelType.SMS;
  readonly deliveryConfirmationRequired = true;

  constructor(@Inject(SMS_PROVIDER) private readonly provider: SmsProvider) {}

  async deliver(
    context: ChannelDeliveryContext,
  ): Promise<ChannelDeliveryResult> {
    const { notification } = context;
    const data = notification.data ?? {};
    const phone = typeof data.phone === 'string' ? data.phone : null;
    if (!phone) {
      throw new Error(
        `Notification ${notification.id} has no data.phone: cannot send SMS`,
      );
    }
    const sender =
      typeof data.smsSender === 'string' ? data.smsSender : undefined;

    const result = await this.provider.send({
      to: phone,
      body: notification.body,
      sender,
    });
    if (!result.success) {
      throw new Error(
        result.errorMessage ??
          `SMS provider error (${result.errorCode ?? 'UNKNOWN'})`,
      );
    }
    return {
      providerMessageId: result.providerMessageId,
      providerStatus: result.providerStatus,
    };
  }
}
