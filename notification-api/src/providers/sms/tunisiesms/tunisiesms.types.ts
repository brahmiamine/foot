/**
 * Champs métier envoyés à TunisieSMS, tels que documentés dans la
 * consigne du projet (§ Envoi d'un SMS) :
 *
 *   Application         TunisieSMS
 *   ├── to        ->    destination
 *   ├── message   ->    content
 *   └── sender    ->    sender
 *
 * Les identifiants de compte (`id`, `api_key`) sont ajoutés séparément par
 * TunisieSmsClient (voir tunisiesms.client.ts) : le mapper ne connaît jamais
 * les credentials.
 */
export interface TunisieSmsMessagePayload {
  destination: string;
  content: string;
  sender?: string;
}

/** Requête complète envoyée sur le fil (payload métier + identifiants de compte). */
export interface TunisieSmsRequestPayload extends TunisieSmsMessagePayload {
  id: string;
  api_key: string;
}

/**
 * Réponse normalisée après parsing XML/JSON, reflétant la structure
 * documentée :
 *
 * <response><status>
 *   <status_code>200</status_code>
 *   <status_msg>ok</status_msg>
 *   <message_id>XXXX</message_id>
 * </status></response>
 */
export interface TunisieSmsRawResponse {
  statusCode: number;
  statusMsg?: string;
  messageId?: string;
}
