import { ar } from "./ar";
import { defaultLocale, type Locale } from "./config";
import { fr, type TranslationKey } from "./fr";

export type TranslationValues = Record<string, string | number>;
export const messages: Record<Locale, Record<TranslationKey, string>> = { fr, ar };
export function translate(locale: Locale, key: TranslationKey, values: TranslationValues = {}): string {
  const template = messages[locale]?.[key] ?? fr[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}
export function createTranslator(locale: Locale = defaultLocale) {
  return (key: TranslationKey, values?: TranslationValues) => translate(locale, key, values);
}
export type { TranslationKey } from "./fr";
export * from "./config";
