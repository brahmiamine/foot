export const locales = ["fr", "ar"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";
export const localeCookieName = "ob_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return locales.includes(value as Locale);
}
