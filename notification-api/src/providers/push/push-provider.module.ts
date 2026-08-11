import { Module } from '@nestjs/common';
import { FcmProvider } from './fcm.provider';
import { WebPushProvider } from './web-push.provider';
import { PUSH_PROVIDER } from './push-provider.interface';

@Module({
  providers: [
    WebPushProvider,
    FcmProvider,
    {
      provide: PUSH_PROVIDER,
      useFactory: (webPush: WebPushProvider, fcm: FcmProvider) => [
        webPush,
        fcm,
      ],
      inject: [WebPushProvider, FcmProvider],
    },
  ],
  exports: [PUSH_PROVIDER],
})
export class PushProviderModule {}
