import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotImplementedSmsProvider } from './not-implemented-sms.provider';
import { TunisieSmsProvider } from './tunisiesms.provider';
import { SMS_PROVIDER } from './sms-provider.interface';

/**
 * TS-44 — `SMS_PROVIDER=tunisiesms` active `TunisieSmsProvider` ; toute
 * autre valeur (ou absente) garde `NotImplementedSmsProvider` (défaut
 * historique, voir avancement.md Epic E14 pour le contexte produit). Même
 * pattern de sélection que `EmailProviderModule`.
 */
@Module({
  providers: [
    NotImplementedSmsProvider,
    TunisieSmsProvider,
    {
      provide: SMS_PROVIDER,
      useFactory: (
        config: ConfigService,
        notImplemented: NotImplementedSmsProvider,
        tunisiesms: TunisieSmsProvider,
      ) => {
        switch (config.get<string>('SMS_PROVIDER')) {
          case 'tunisiesms':
            return tunisiesms;
          default:
            return notImplemented;
        }
      },
      inject: [ConfigService, NotImplementedSmsProvider, TunisieSmsProvider],
    },
  ],
  exports: [SMS_PROVIDER],
})
export class SmsProviderModule {}
