// Alphabet GSM 03.38 (jeu de base + extension) : sert uniquement à décider si
// un message est encodable en 7-bit ("latin") ou nécessite l'Unicode
// (arabe, emojis, symboles hors jeu GSM), voir § Encodage SMS.
const GSM_7BIT_BASIC_SET =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_7BIT_EXTENDED_SET = '^{}\\[~]|€';
const GSM_7BIT_CHARS = new Set(
  Array.from(GSM_7BIT_BASIC_SET + GSM_7BIT_EXTENDED_SET),
);

const LATIN_SINGLE_SEGMENT_LIMIT = 160;
const LATIN_MULTI_SEGMENT_LIMIT = 153;
const UNICODE_SINGLE_SEGMENT_LIMIT = 70;
const UNICODE_MULTI_SEGMENT_LIMIT = 67;

export type SmsEncoding = 'GSM_7BIT' | 'UNICODE';

export interface SmsContentAnalysis {
  encoding: SmsEncoding;
  length: number;
  singleSegmentLimit: number;
  segments: number;
}

/**
 * Détecte l'encodage (GSM-7 vs Unicode) et estime le nombre de segments SMS
 * (§ Encodage SMS : 160 caractères latin / 70 caractères Unicode par SMS).
 * Purement informatif (logs, observabilité) : ce module ne tronque et ne
 * découpe jamais le message — TunisieSMS gère elle-même le multi-part si son
 * API le supporte ; aucun découpage arbitraire n'est implémenté ici.
 */
export function analyzeSmsContent(message: string): SmsContentAnalysis {
  const characters = Array.from(message);
  const isGsm7 = characters.every((char) => GSM_7BIT_CHARS.has(char));
  const encoding: SmsEncoding = isGsm7 ? 'GSM_7BIT' : 'UNICODE';
  const length = characters.length;
  const singleSegmentLimit = isGsm7
    ? LATIN_SINGLE_SEGMENT_LIMIT
    : UNICODE_SINGLE_SEGMENT_LIMIT;
  const multiSegmentLimit = isGsm7
    ? LATIN_MULTI_SEGMENT_LIMIT
    : UNICODE_MULTI_SEGMENT_LIMIT;

  let segments: number;
  if (length === 0) segments = 0;
  else if (length <= singleSegmentLimit) segments = 1;
  else segments = Math.ceil(length / multiSegmentLimit);

  return { encoding, length, singleSegmentLimit, segments };
}
