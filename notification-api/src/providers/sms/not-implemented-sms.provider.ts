import { Injectable } from '@nestjs/common';
import { SmsProvider } from './sms-provider.interface';

/**
 * SMS est explicitement hors périmètre V1 (§36). Ce stub existe pour que
 * SmsChannel (voir channels/sms) ait un provider à injecter dès
 * aujourd'hui : brancher un vrai fournisseur (ex: Twilio) plus tard ne
 * demandera qu'une nouvelle classe SmsProvider + un changement de config,
 * sans toucher SmsChannel ni le reste de l'architecture.
 */
@Injectable()
export class NotImplementedSmsProvider implements SmsProvider {
  readonly name = 'not-implemented';

  send(): Promise<void> {
    throw new Error(
      'SMS channel is not implemented yet (out of scope for V1, see §36)',
    );
  }
}
