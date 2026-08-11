import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { EMAIL_PROVIDER } from './email-provider.interface';
import { SmtpEmailProvider } from './smtp-email.provider';
import { ResendEmailProvider } from './resend-email.provider';
import { SendgridEmailProvider } from './sendgrid-email.provider';

@Module({
  imports: [HttpModule],
  providers: [
    SmtpEmailProvider,
    ResendEmailProvider,
    SendgridEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (
        config: ConfigService,
        smtp: SmtpEmailProvider,
        resend: ResendEmailProvider,
        sendgrid: SendgridEmailProvider,
      ) => {
        switch (config.get<string>('EMAIL_PROVIDER')) {
          case 'resend':
            return resend;
          case 'sendgrid':
            return sendgrid;
          default:
            return smtp;
        }
      },
      inject: [
        ConfigService,
        SmtpEmailProvider,
        ResendEmailProvider,
        SendgridEmailProvider,
      ],
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class EmailProviderModule {}
