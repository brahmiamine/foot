import { Injectable } from '@nestjs/common';
import { SmsProvider, SmsSendResult } from './sms-provider.interface';

/**
 * Provider actif par défaut tant que `SMS_PROVIDER` n'est pas configuré à
 * une valeur reconnue (ex: `tunisiesms`, voir tunisiesms/). Renvoie un échec
 * structuré plutôt que de lever, pour que SmsChannel/DeliveriesService
 * enregistrent un échec explicite au lieu d'un crash de worker.
 */
@Injectable()
export class NotImplementedSmsProvider implements SmsProvider {
  readonly name = 'not-implemented';

  send(): Promise<SmsSendResult> {
    return Promise.resolve({
      success: false,
      errorCode: 'SMS_PROVIDER_NOT_CONFIGURED',
      errorMessage:
        'No SMS provider is configured (set SMS_PROVIDER=tunisiesms and the TUNISIESMS_* variables)',
    });
  }
}
