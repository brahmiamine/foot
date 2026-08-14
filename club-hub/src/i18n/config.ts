export const locales = ["fr", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";
export const localeCookieName = "team_manager_locale";
export const isLocale = (value?: string | null): value is Locale => locales.includes(value as Locale);
