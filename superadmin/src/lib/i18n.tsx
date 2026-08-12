'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import frMessages from '@/locales/fr.json'
import arMessages from '@/locales/ar.json'
import { DEFAULT_LOCALE, LOCALE_COOKIE, SUPPORTED_LOCALES, getDirection, interpolate, isLocale, type Locale, type TranslationParams } from './i18nShared'

export { DEFAULT_LOCALE, LOCALE_COOKIE, SUPPORTED_LOCALES, getDirection, interpolate, isLocale }
export type { Locale, TranslationParams }

const translations: Record<Locale, Record<string, string>> = { fr: frMessages, ar: arMessages }

export function translateMessage(key: string, locale: Locale, params?: TranslationParams) {
  return interpolate(translations[locale][key] ?? translations.fr[key] ?? key, params)
}

export function formatDate(value: Date | string | number, locale: Locale, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : 'fr-FR', options).format(new Date(value))
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : 'fr-FR', options).format(value)
}

interface TranslationContextValue {
  locale: Locale
  dir: 'ltr' | 'rtl'
  t: (key: string, params?: TranslationParams) => string
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  switchLocale: (locale: Locale) => void
}

const TranslationContext = createContext<TranslationContextValue | null>(null)

export function TranslationProvider({ children, initialLocale = DEFAULT_LOCALE }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(isLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE)
  const dir = getDirection(locale)
  const t = useCallback((key: string, params?: TranslationParams) => translateMessage(key, locale, params), [locale])
  const switchLocale = useCallback((next: Locale) => {
    const safeLocale = isLocale(next) ? next : DEFAULT_LOCALE
    setLocale(safeLocale)
    document.cookie = `${LOCALE_COOKIE}=${safeLocale}; Path=/; Max-Age=31536000; SameSite=Lax`
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = dir
    document.title = t('meta.title')
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'))
  }, [dir, locale, t])

  const value = useMemo(() => ({
    locale, dir, t, switchLocale,
    formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => formatDate(value, locale, options),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(value, locale, options),
  }), [dir, locale, switchLocale, t])

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>
}

export function useTranslations() {
  const context = useContext(TranslationContext)
  if (!context) throw new Error('useTranslations must be used inside TranslationProvider')
  return context
}
