import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationChannelType } from '../../common/enums/channel.enum';
import { PushSubscriptionsService } from '../../push-subscriptions/push-subscriptions.service';
import {
  InvalidPushSubscriptionError,
  PUSH_PROVIDER,
  type PushProvider,
} from '../../providers/push/push-provider.interface';
import type {
  ChannelDeliveryContext,
  NotificationChannel,
} from '../channel.interface';

@Injectable()
export class PushChannel implements NotificationChannel {
  readonly type = NotificationChannelType.PUSH;
  private readonly logger = new Logger(PushChannel.name);

  constructor(
    @Inject(PUSH_PROVIDER) private readonly providers: PushProvider[],
    private readonly subscriptions: PushSubscriptionsService,
  ) {}

  async deliver(context: ChannelDeliveryContext): Promise<void> {
    const { notification } = context;
    const devices = await this.subscriptions.findByUser(notification.userId);
    if (devices.length === 0) {
      throw new Error(`No push subscription for user ${notification.userId}`);
    }

    const message = {
      title: notification.title,
      body: notification.body,
      data: notification.data,
    };

    const errors: Error[] = [];
    let delivered = 0;
    for (const device of devices) {
      const provider = this.providers.find((candidate) =>
        candidate.supports(device),
      );
      if (!provider) continue;
      try {
        await provider.send(device, message);
        await this.subscriptions.touchLastUsed(device.id);
        delivered += 1;
      } catch (error) {
        if (error instanceof InvalidPushSubscriptionError) {
          this.logger.log(`Removing invalid push subscription ${device.id}`);
          await this.subscriptions.removeById(device.id);
          continue;
        }
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (delivered === 0) {
      throw (
        errors[0] ??
        new Error(`No usable push subscription for user ${notification.userId}`)
      );
    }
  }
}
