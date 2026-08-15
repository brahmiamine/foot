export const locales = ['fr', 'ar'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'fr'
export const intlLocales: Record<Locale, string> = {
  fr: 'fr-FR',
  ar: 'ar-TN',
}

export type TextDirection = 'ltr' | 'rtl'

export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale)
}

export function getDirection(locale: Locale): TextDirection {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

export function getIntlLocale(locale: Locale): string {
  return intlLocales[locale]
}

export function resolveLocale(value: unknown, fallback: Locale = defaultLocale): Locale {
  return isLocale(value) ? value : fallback
}
