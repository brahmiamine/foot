import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import { PushSubscription } from '../../push-subscriptions/entities/push-subscription.entity';
import { PushPlatform } from '../../common/enums/platform.enum';
import {
  InvalidPushSubscriptionError,
  PushMessage,
  PushProvider,
} from './push-provider.interface';

/** Web Push standard (navigateurs desktop/mobile) — §16. */
@Injectable()
export class WebPushProvider implements PushProvider, OnModuleInit {
  readonly name = 'web-push';
  private readonly logger = new Logger(WebPushProvider.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const publicKey = this.config.get<string>('WEB_PUSH_PUBLIC_KEY');
    const privateKey = this.config.get<string>('WEB_PUSH_PRIVATE_KEY');
    if (!publicKey || !privateKey) {
      this.logger.warn(
        'WEB_PUSH_PUBLIC_KEY/PRIVATE_KEY not set: WebPushProvider is inactive.',
      );
      return;
    }
    webpush.setVapidDetails(
      this.config.get<string>('WEB_PUSH_CONTACT_EMAIL') ??
        'mailto:contact@foot.tn',
      publicKey,
      privateKey,
    );
    this.configured = true;
  }

  supports(subscription: PushSubscription): boolean {
    return (
      subscription.platform === PushPlatform.WEB &&
      !!subscription.endpoint &&
      !!subscription.p256dh &&
      !!subscription.auth
    );
  }

  async send(
    subscription: PushSubscription,
    message: PushMessage,
  ): Promise<void> {
    if (!this.configured) {
      throw new Error('WebPushProvider is not configured (VAPID keys missing)');
    }
    if (!subscription.endpoint || !subscription.p256dh || !subscription.auth) {
      throw new InvalidPushSubscriptionError('Missing web push endpoint/keys');
    }
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify({
          title: message.title,
          body: message.body,
          data: message.data ?? {},
        }),
      );
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        throw new InvalidPushSubscriptionError('Web push subscription expired');
      }
      throw error;
    }
  }
}
