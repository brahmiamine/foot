import { cookies } from 'next/headers'
import frMessages from '@/locales/fr.json'
import arMessages from '@/locales/ar.json'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, interpolate, type Locale, type TranslationParams } from './i18nShared'

const translations: Record<Locale, Record<string, string>> = { fr: frMessages, ar: arMessages }

export async function getServerLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : DEFAULT_LOCALE
}

export function getServerTranslations(locale: unknown) {
  return translations[isLocale(locale) ? locale : DEFAULT_LOCALE]
}

export function translate(key: string, locale: unknown, params?: TranslationParams): string {
  const safeLocale = isLocale(locale) ? locale : DEFAULT_LOCALE
  return interpolate(translations[safeLocale][key] ?? translations.fr[key] ?? key, params)
}
