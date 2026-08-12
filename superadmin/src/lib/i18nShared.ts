export const SUPPORTED_LOCALES = ['fr', 'ar'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export type TranslationParams = Record<string, string | number>
export const DEFAULT_LOCALE: Locale = 'fr'
export const LOCALE_COOKIE = 'superadmin-locale'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale)
}

export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

export function interpolate(template: string, params: TranslationParams = {}) {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
  )
}
