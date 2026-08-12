export const dictionaries = {
  fr: {
    "auth.layout.title": "Connexion",
    "auth.layout.description": "Authentification centralisée",
  },
  ar: {
    "auth.layout.title": "تسجيل الدخول",
    "auth.layout.description": "المصادقة المركزية",
  },
} as const;
export type TranslationKey = keyof typeof dictionaries.fr;
export type Locale = keyof typeof dictionaries;
export function translate(locale: Locale, key: TranslationKey, values: Record<string, string | number> = {}) {
  let message: string = dictionaries[locale]?.[key] ?? dictionaries.fr[key];
  for (const [name, value] of Object.entries(values)) message = message.replaceAll(`{${name}}`, String(value));
  return message;
}
