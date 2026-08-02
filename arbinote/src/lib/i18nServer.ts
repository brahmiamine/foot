import { cookies } from 'next/headers'
import frMessages from '@/locales/fr.json'
import arMessages from '@/locales/ar.json'
import enMessages from '@/locales/en.json'

export type Locale = 'fr' | 'ar' | 'en'

const defaultLocale: Locale = 'fr'

const translations: Record<Locale, Record<string, string>> = {
  fr: frMessages,
  ar: arMessages,
  en: enMessages,
}

const SUPPORTED_LOCALES = new Set<Locale>(['fr', 'ar', 'en'])

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) {
    return template
  }
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
    template
  )
}

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('arbinote-locale')?.value
  if (cookieLocale && SUPPORTED_LOCALES.has(cookieLocale as Locale)) {
    return cookieLocale as Locale
  }
  return defaultLocale
}

export function getServerTranslations(locale: Locale) {
  return translations[locale]
}

export function translate(key: string, locale: Locale, params?: Record<string, string | number>): string {
  const template = translations[locale]?.[key] ?? translations[defaultLocale][key] ?? key
  return interpolate(template, params)
}


