import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PushSubscription } from '../../push-subscriptions/entities/push-subscription.entity';
import { PushPlatform } from '../../common/enums/platform.enum';
import { PushProvider } from './push-provider.interface';

/**
 * Firebase Cloud Messaging (Android/iOS/Web via token FCM) — §16.
 * Architecture préparée (interface commune PushProvider) mais intégration
 * HTTP v1 non implémentée en V1 (hors périmètre initial explicite, §36) :
 * nécessite un compte de service Firebase (JWT signé) non requis par les cas
 * d'usage V1 (§35), qui reposent sur Web Push. À implémenter ici sans
 * toucher au reste du système quand un besoin mobile natif apparaîtra.
 */
@Injectable()
export class FcmProvider implements PushProvider {
  readonly name = 'fcm';
  private readonly logger = new Logger(FcmProvider.name);

  constructor(private readonly config: ConfigService) {}

  supports(subscription: PushSubscription): boolean {
    return (
      (subscription.platform === PushPlatform.ANDROID ||
        subscription.platform === PushPlatform.IOS) &&
      !!subscription.token
    );
  }

  send(): Promise<void> {
    if (!this.config.get<string>('FCM_PROJECT_ID')) {
      throw new Error('FcmProvider is not configured (FCM_PROJECT_ID missing)');
    }
    throw new Error(
      'FcmProvider is not implemented yet (see providers/push/fcm.provider.ts)',
    );
  }
}
