const TUNISIA_COUNTRY_CODE = '216';
const TUNISIA_LOCAL_NUMBER_LENGTH = 8;

export class InvalidPhoneNumberError extends Error {}

/**
 * Normalise un numéro de téléphone vers le format E.164 attendu par
 * TunisieSMS (§ Numéro de téléphone). Les numéros tunisiens sont acceptés
 * en local (8 chiffres), avec l'indicatif sans "+" ("216XXXXXXXX") ou déjà
 * au format international ("+216XXXXXXXX") et toujours normalisés vers
 * "+216XXXXXXXX". Un numéro déjà international avec un autre indicatif
 * n'est jamais modifié ("ne pas modifier arbitrairement les numéros
 * internationaux") : sans indicatif reconnaissable, on refuse plutôt que de
 * deviner le pays.
 */
export function normalizePhoneNumber(raw: string): string {
  const trimmed = raw.trim().replace(/[\s.\-()]/g, '');
  if (!trimmed) {
    throw new InvalidPhoneNumberError('Phone number is empty');
  }

  const withPlus = trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : trimmed;

  if (/^\+\d{8,15}$/.test(withPlus)) {
    return withPlus;
  }

  const digitsOnly = withPlus.replace(/^\+/, '');

  if (
    digitsOnly.startsWith(TUNISIA_COUNTRY_CODE) &&
    digitsOnly.length ===
      TUNISIA_COUNTRY_CODE.length + TUNISIA_LOCAL_NUMBER_LENGTH
  ) {
    return `+${digitsOnly}`;
  }

  if (/^\d{8}$/.test(digitsOnly)) {
    return `+${TUNISIA_COUNTRY_CODE}${digitsOnly}`;
  }

  throw new InvalidPhoneNumberError(`Unrecognized phone number format: ${raw}`);
}

/** Masque un numéro dans les logs (§ Logs) : garde l'indicatif et les 3 derniers chiffres, ex: "+216*****123". */
export function maskPhoneNumber(phone: string): string {
  if (phone.length <= 6) return '***';
  const prefix = phone.slice(0, 4);
  const suffix = phone.slice(-3);
  return `${prefix}${'*'.repeat(phone.length - prefix.length - suffix.length)}${suffix}`;
}
