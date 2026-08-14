/**
 * TS-45 : normalisation E.164 pour la Tunisie. `User.phoneNumber` (base
 * partagée) est saisi librement (0XX XXX XXX, +216XXXXXXXX, 216XXXXXXXX,
 * espaces/tirets…) — les providers SMS (voir providers/sms/) exigent un
 * format strict avant tout envoi.
 */
const TUNISIA_COUNTRY_CODE = '216';
const TUNISIA_LOCAL_DIGITS = 8;

/**
 * Renvoie le numéro au format `+216XXXXXXXX`, ou `null` si le numéro fourni
 * n'est pas un numéro tunisien à 8 chiffres reconnaissable (aucune
 * international autre que la Tunisie n'est supportée aujourd'hui — les
 * providers SMS configurés ciblent ce marché, voir TS-44).
 */
export function normalizeTunisianPhoneNumber(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;

  const digitsOnly = raw.replace(/[^\d]/g, '');
  if (!digitsOnly) return null;

  let localDigits: string;
  if (digitsOnly.startsWith(TUNISIA_COUNTRY_CODE) && digitsOnly.length === 11) {
    localDigits = digitsOnly.slice(TUNISIA_COUNTRY_CODE.length);
  } else if (digitsOnly.length === TUNISIA_LOCAL_DIGITS) {
    localDigits = digitsOnly;
  } else if (
    digitsOnly.startsWith('0') &&
    digitsOnly.length === TUNISIA_LOCAL_DIGITS + 1
  ) {
    localDigits = digitsOnly.slice(1);
  } else {
    return null;
  }

  if (localDigits.length !== TUNISIA_LOCAL_DIGITS) return null;
  return `+${TUNISIA_COUNTRY_CODE}${localDigits}`;
}

/** Format E.164 strict attendu par les providers SMS (voir sms-provider.interface.ts). */
export function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}
