import { SmsMessage, SmsSendResult } from '../sms-provider.interface';
import { normalizePhoneNumber } from './tunisiesms.phone';
import {
  describeTunisieSmsStatusCode,
  isTunisieSmsSuccessStatusCode,
} from './tunisiesms.status-codes';
import {
  TunisieSmsMessagePayload,
  TunisieSmsRawResponse,
} from './tunisiesms.types';

/**
 * Construit le payload métier envoyé à TunisieSMS à partir d'une requête
 * applicative (§ Envoi d'un SMS). Ne connaît jamais les identifiants de
 * compte (`id`/`api_key`, ajoutés par TunisieSmsClient) — cette fonction est
 * pure et testable sans configuration ni HTTP.
 */
export function buildTunisieSmsPayload(
  message: SmsMessage,
  defaultSender?: string,
): TunisieSmsMessagePayload {
  const destination = normalizePhoneNumber(message.to);
  const sender = message.sender ?? defaultSender;

  return {
    destination,
    content: message.body,
    ...(sender ? { sender } : {}),
  };
}

/**
 * Traduit la réponse TunisieSMS parsée vers le modèle interne, indépendant
 * du format d'origine (§ Réponse de l'API). `status_code = 200` signifie
 * "accepté par la plateforme", jamais "livré" (voir §"Différence entre
 * requête acceptée et SMS livré") : ce mapper ne renvoie donc rien de plus
 * qu'un `success: true` + `providerMessageId` — jamais un statut "DELIVERED".
 */
export function mapTunisieSmsResponse(
  raw: TunisieSmsRawResponse,
): SmsSendResult {
  if (isTunisieSmsSuccessStatusCode(raw.statusCode)) {
    return {
      success: true,
      providerMessageId: raw.messageId,
      providerStatus: raw.statusMsg ?? String(raw.statusCode),
    };
  }

  const { errorCode, message } = describeTunisieSmsStatusCode(raw.statusCode);
  return {
    success: false,
    providerStatus: raw.statusMsg ?? String(raw.statusCode),
    errorCode,
    errorMessage: raw.statusMsg || message,
  };
}
