import { defaultLocale, type Locale } from "./config";
import { dictionaries, translate, type TranslationKey, type TranslationValues } from "./dictionaries";

export { dictionaries, translate };
export type { TranslationKey, TranslationValues };
export function createTranslator(locale: Locale = defaultLocale) {
  return (key: TranslationKey, values?: TranslationValues) => translate(locale, key, values);
}
export * from "./config";
