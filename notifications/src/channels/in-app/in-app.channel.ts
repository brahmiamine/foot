import { Injectable } from '@nestjs/common';
import { NotificationChannelType } from '../../common/enums/channel.enum';
import type { NotificationChannel } from '../channel.interface';

/**
 * Le canal in-app n'a rien à "envoyer" : la ligne `notifications` créée par
 * NotificationsService EST la notification in-app, immédiatement visible via
 * GET /api/notifications (§13). deliver() ne fait donc rien d'observable ;
 * il existe pour que NotificationsService traite les canaux de façon
 * uniforme (§10) et que DeliveriesService trace bien un delivery IN_APP
 * "DELIVERED" dans l'audit (§25).
 */
@Injectable()
export class InAppChannel implements NotificationChannel {
  readonly type = NotificationChannelType.IN_APP;

  deliver(): Promise<void> {
    return Promise.resolve();
  }
}
