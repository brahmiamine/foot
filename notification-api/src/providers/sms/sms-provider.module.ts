import { Module } from '@nestjs/common';
import { NotImplementedSmsProvider } from './not-implemented-sms.provider';
import { SMS_PROVIDER } from './sms-provider.interface';

@Module({
  providers: [
    NotImplementedSmsProvider,
    { provide: SMS_PROVIDER, useExisting: NotImplementedSmsProvider },
  ],
  exports: [SMS_PROVIDER],
})
export class SmsProviderModule {}
