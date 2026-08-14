import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsMessage, SmsProvider } from './sms-provider.interface';
import { isValidE164 } from '../../common/phone-number';

/**
 * TS-44 — intégration Tunisiesms. Provider HTTP simple (POST JSON, clé API
 * en en-tête) : pas de SDK officiel maintenu, cohérent avec le reste du
 * dépôt qui appelle ses fournisseurs externes en `fetch` brut (voir
 * FcmProvider). `SMS_SENDER` est l'identifiant expéditeur affiché au
 * destinataire (alphanumeric sender ID côté Tunisiesms), configuré une
 * fois pour toute l'app plutôt que par message.
 */
@Injectable()
export class TunisieSmsProvider implements SmsProvider, OnModuleInit {
  readonly name = 'tunisiesms';
  private readonly logger = new Logger(TunisieSmsProvider.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (!this.getApiUrl() || !this.getApiKey() || !this.getSender()) {
      this.logger.warn(
        'SMS_API_URL/SMS_API_KEY/SMS_SENDER not set: TunisieSmsProvider is inactive.',
      );
      return;
    }
    this.configured = true;
  }

  private getApiUrl(): string | undefined {
    return this.config.get<string>('SMS_API_URL');
  }

  private getApiKey(): string | undefined {
    return this.config.get<string>('SMS_API_KEY');
  }

  private getSender(): string | undefined {
    return this.config.get<string>('SMS_SENDER');
  }

  async send(message: SmsMessage): Promise<void> {
    if (!this.configured) {
      throw new Error(
        'TunisieSmsProvider is not configured (SMS_API_URL/SMS_API_KEY/SMS_SENDER missing)',
      );
    }
    if (!isValidE164(message.to)) {
      throw new Error(`Invalid E.164 phone number: ${message.to}`);
    }

    let res: Response;
    try {
      res = await fetch(this.getApiUrl()!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getApiKey()}`,
        },
        body: JSON.stringify({
          sender: this.getSender(),
          to: message.to,
          text: message.body,
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Tunisiesms request failed: ${reason}`);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Tunisiesms send failed: ${res.status} ${body}`);
    }
  }
}
