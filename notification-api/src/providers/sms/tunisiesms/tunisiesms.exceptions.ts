export type TunisieSmsTransportErrorCode =
  | 'NOT_CONFIGURED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE';

/**
 * Échec au niveau transport (réseau/HTTP/parsing) — distinct d'un refus
 * métier TunisieSMS (crédit insuffisant, sender non autorisé, ...), qui
 * n'est jamais une exception mais un `SendSmsResponse.success = false` (voir
 * tunisiesms.mapper.ts). Une réponse impossible à parser ne doit jamais être
 * considérée comme un succès (§ Gestion des erreurs HTTP).
 */
export class TunisieSmsTransportError extends Error {
  constructor(
    readonly code: TunisieSmsTransportErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'TunisieSmsTransportError';
  }
}
