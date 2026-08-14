import { Module } from '@nestjs/common';
import { EmailProviderModule } from '../providers/email/email-provider.module';
import { PushProviderModule } from '../providers/push/push-provider.module';
import { SmsProviderModule } from '../providers/sms/sms-provider.module';
import { PushSubscriptionsModule } from '../push-subscriptions/push-subscriptions.module';
import { TemplatesModule } from '../templates/templates.module';
import {
  CHANNEL_REGISTRY,
  type NotificationChannel,
} from './channel.interface';
import { EmailChannel } from './email/email.channel';
import { InAppChannel } from './in-app/in-app.channel';
import { PushChannel } from './push/push.channel';
import { SmsChannel } from './sms/sms.channel';

@Module({
  imports: [
    EmailProviderModule,
    PushProviderModule,
    SmsProviderModule,
    PushSubscriptionsModule,
    TemplatesModule,
  ],
  providers: [
    InAppChannel,
    EmailChannel,
    PushChannel,
    SmsChannel,
    {
      provide: CHANNEL_REGISTRY,
      useFactory: (
        inApp: InAppChannel,
        email: EmailChannel,
        push: PushChannel,
        sms: SmsChannel,
      ): Map<string, NotificationChannel> =>
        new Map<string, NotificationChannel>([
          [inApp.type, inApp],
          [email.type, email],
          [push.type, push],
          [sms.type, sms],
        ]),
      inject: [InAppChannel, EmailChannel, PushChannel, SmsChannel],
    },
  ],
  exports: [CHANNEL_REGISTRY, InAppChannel],
})
export class ChannelsModule {}
