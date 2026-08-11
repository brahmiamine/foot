import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SmsMessage,
  SmsProvider,
  SmsSendResult,
} from '../sms-provider.interface';
import { analyzeSmsContent } from './tunisiesms.encoding';
import { TunisieSmsTransportError } from './tunisiesms.exceptions';
import {
  buildTunisieSmsPayload,
  mapTunisieSmsResponse,
} from './tunisiesms.mapper';
import { InvalidPhoneNumberError, maskPhoneNumber } from './tunisiesms.phone';
import { TunisieSmsClient } from './tunisiesms.client';
import type { TunisieSmsMessagePayload } from './tunisiesms.types';

/**
 * Provider TunisieSMS (§ Architecture). Orchestre uniquement :
 * application request -> mapping (tunisiesms.mapper) -> TunisieSmsClient ->
 * mapping réponse -> SmsSendResult. Ne contient aucune logique métier
 * (utilisateurs, commandes, notifications applicatives, OTP, templates) —
 * il reçoit les données nécessaires à l'envoi et parle à TunisieSMS.
 *
 * Ne fait jamais de retry lui-même (§ Retry) : un timeout ne prouve pas que
 * le SMS n'a pas été envoyé (TunisieSMS a pu recevoir la requête sans que la
 * réponse nous parvienne), donc renvoyer un échec ici ne doit pas être
 * réinterprété comme "aucun SMS n'est parti" par l'appelant.
 */
@Injectable()
export class TunisieSmsProvider implements SmsProvider {
  readonly name = 'tunisiesms';
  private readonly logger = new Logger(TunisieSmsProvider.name);

  constructor(
    private readonly client: TunisieSmsClient,
    private readonly config: ConfigService,
  ) {}

  async send(message: SmsMessage): Promise<SmsSendResult> {
    let payload: TunisieSmsMessagePayload;
    try {
      payload = buildTunisieSmsPayload(
        message,
        this.config.get<string>('TUNISIESMS_SENDER'),
      );
    } catch (error) {
      if (error instanceof InvalidPhoneNumberError) {
        return {
          success: false,
          errorCode: 'INVALID_PHONE_NUMBER',
          errorMessage: error.message,
        };
      }
      throw error;
    }

    const destinationLog = maskPhoneNumber(payload.destination);
    const analysis = analyzeSmsContent(message.body);
    this.logger.log(
      `sms provider: tunisiesms destination: ${destinationLog} encoding: ${analysis.encoding} segments: ${analysis.segments}`,
    );

    try {
      const raw = await this.client.send(payload);
      const result = mapTunisieSmsResponse(raw);
      this.logger.log(
        `sms provider: tunisiesms status: ${result.success ? 'SUBMITTED' : 'FAILED'} messageId: ${result.providerMessageId ?? 'n/a'} destination: ${destinationLog}`,
      );
      return result;
    } catch (error) {
      if (error instanceof TunisieSmsTransportError) {
        this.logger.error(
          `sms provider: tunisiesms transport error (${error.code}) destination: ${destinationLog}: ${error.message}`,
        );
        return {
          success: false,
          errorCode: error.code,
          errorMessage: error.message,
        };
      }
      throw error;
    }
  }
}
