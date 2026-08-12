export type Lang = "fr" | "ar";
export const LANGUAGE_COOKIE = "matchsheet-lang";
export const DEFAULT_LANG: Lang = "fr";

export function resolveLanguage(value?: string | null): Lang {
  return value === "ar" ? "ar" : DEFAULT_LANG;
}

export function directionFor(lang: Lang): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}

export function localeFor(lang: Lang): "fr-FR" | "ar-TN" {
  return lang === "ar" ? "ar-TN" : "fr-FR";
}
