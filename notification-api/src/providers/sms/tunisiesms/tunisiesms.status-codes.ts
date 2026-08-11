export const TUNISIESMS_SUCCESS_STATUS_CODE = 200;

export interface TunisieSmsStatusInfo {
  errorCode: string;
  message: string;
}

/**
 * Codes documentés par TunisieSMS (§ Codes de réponse). Mapping figé, à
 * étendre uniquement si TunisieSMS documente de nouveaux codes — ne pas
 * inventer de code non documenté.
 */
const STATUS_CODE_INFO: Record<number, TunisieSmsStatusInfo> = {
  200: { errorCode: 'OK', message: 'SMS accepted by TunisieSMS' },
  400: { errorCode: 'MISSING_ID', message: 'Missing account id' },
  401: { errorCode: 'UNAUTHORIZED_ID', message: 'Unauthorized account id' },
  402: { errorCode: 'INSUFFICIENT_CREDIT', message: 'Insufficient credit' },
  420: { errorCode: 'DAILY_QUOTA_EXCEEDED', message: 'Daily quota exceeded' },
  430: {
    errorCode: 'MESSAGE_REQUIRED',
    message: 'Message content is required',
  },
  431: {
    errorCode: 'DESTINATION_REQUIRED',
    message: 'Destination is required',
  },
  440: {
    errorCode: 'MESSAGE_TOO_LONG',
    message: 'Message content is too long',
  },
  441: {
    errorCode: 'DESTINATION_NOT_ALLOWED',
    message: 'Destination is not allowed',
  },
  442: { errorCode: 'SENDER_NOT_ALLOWED', message: 'Sender is not allowed' },
};

export function isTunisieSmsSuccessStatusCode(statusCode: number): boolean {
  return statusCode === TUNISIESMS_SUCCESS_STATUS_CODE;
}

/** Traduit un `status_code` TunisieSMS en erreur applicative normalisée. Code inconnu -> `UNKNOWN_ERROR` (jamais silencieusement traité comme un succès). */
export function describeTunisieSmsStatusCode(
  statusCode: number,
): TunisieSmsStatusInfo {
  return (
    STATUS_CODE_INFO[statusCode] ?? {
      errorCode: 'UNKNOWN_ERROR',
      message: `Unknown TunisieSMS status code: ${statusCode}`,
    }
  );
}
