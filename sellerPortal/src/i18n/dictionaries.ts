export const dictionaries = {
  fr: {
    "app.layout.title": "Seller Portal",
    "app.layout.description": "Portail vendeur du marketplace de votre club",
  },
  ar: {
    "app.layout.title": "بوابة البائع",
    "app.layout.description": "بوابة بائع متجر ناديك",
  },
} as const;
export type TranslationKey = keyof typeof dictionaries.fr;
export type Locale = keyof typeof dictionaries;
export function translate(locale: Locale, key: TranslationKey, values: Record<string, string | number> = {}) {
  let message: string = dictionaries[locale]?.[key] ?? dictionaries.fr[key];
  for (const [name, value] of Object.entries(values)) message = message.replaceAll(`{${name}}`, String(value));
  return message;
}
