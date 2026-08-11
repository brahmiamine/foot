import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { NotImplementedSmsProvider } from './not-implemented-sms.provider';
import { SMS_PROVIDER } from './sms-provider.interface';
import { TunisieSmsClient } from './tunisiesms/tunisiesms.client';
import { TunisieSmsProvider } from './tunisiesms/tunisiesms.provider';

@Module({
  imports: [HttpModule],
  providers: [
    NotImplementedSmsProvider,
    TunisieSmsClient,
    TunisieSmsProvider,
    {
      provide: SMS_PROVIDER,
      useFactory: (
        config: ConfigService,
        tunisiesms: TunisieSmsProvider,
        notImplemented: NotImplementedSmsProvider,
      ) =>
        config.get<string>('SMS_PROVIDER') === 'tunisiesms'
          ? tunisiesms
          : notImplemented,
      inject: [ConfigService, TunisieSmsProvider, NotImplementedSmsProvider],
    },
  ],
  exports: [SMS_PROVIDER],
})
export class SmsProviderModule {}
