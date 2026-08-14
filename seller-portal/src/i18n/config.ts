export const locales = ["fr", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";
export const localeCookie = "seller_locale";
export const intlLocales: Record<Locale, string> = { fr: "fr-FR", ar: "ar-TN" };
export function isLocale(value: unknown): value is Locale { return locales.includes(value as Locale); }
