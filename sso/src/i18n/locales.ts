/**
 * Locales supportées par le SSO. Pas de routage par URL ([locale] segment) —
 * les chemins de cette app sont référencés par les redirections des 4 autres
 * apps (matchsheet, arbinote, superadmin, teamManager) et ne doivent pas
 * changer. La locale est stockée dans un cookie dédié, séparé du cookie de
 * session (`SSO_COOKIE_NAME`).
 */
export const locales = ["fr", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

/** Cookie de préférence de langue — n'a rien à voir avec le cookie de session SSO. */
export const LOCALE_COOKIE_NAME = "foot_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
