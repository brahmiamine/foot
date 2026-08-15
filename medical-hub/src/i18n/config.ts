export const locales = ["fr", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";
export const localeCookieName = "medical_hub_locale";
export const isLocale = (value?: string | null): value is Locale => locales.includes(value as Locale);
export const localeDirection = (locale: Locale): "ltr" | "rtl" => (locale === "ar" ? "rtl" : "ltr");
