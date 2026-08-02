'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import frMessages from '@/locales/fr.json'
import arMessages from '@/locales/ar.json'
import enMessages from '@/locales/en.json'

export type Locale = 'fr' | 'ar' | 'en'

const SUPPORTED_LOCALES: Locale[] = ['fr', 'ar', 'en']

function isLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale)
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) {
    return template
  }
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
    template
  )
}

interface TranslationContextValue {
  locale: Locale
  dir: 'ltr' | 'rtl'
  t: (key: string, params?: Record<string, string | number>) => string
  switchLocale: (newLocale: Locale) => void
}

const defaultLocale: Locale = 'fr'

const translations: Record<Locale, Record<string, string>> = {
  fr: frMessages,
  ar: arMessages,
  en: enMessages,
}

const TranslationContext = createContext<TranslationContextValue>({
  locale: defaultLocale,
  dir: 'ltr',
  t: (key, params) => interpolate(translations[defaultLocale][key] ?? key, params),
  switchLocale: () => {},
})

interface TranslationProviderProps {
  children: ReactNode
  initialLocale?: Locale
}

export function TranslationProvider({
  children,
  initialLocale = defaultLocale,
}: TranslationProviderProps) {
  const sanitizedInitialLocale = isLocale(initialLocale) ? initialLocale : defaultLocale
  const [locale, setLocale] = useState<Locale>(sanitizedInitialLocale)
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  const switchLocale = (newLocale: Locale) => {
    const nextLocale = isLocale(newLocale) ? newLocale : defaultLocale
    setLocale(nextLocale)
    if (typeof window !== 'undefined') {
      localStorage.setItem('arbinote-locale', nextLocale)
      document.cookie = `arbinote-locale=${nextLocale}; path=/; max-age=31536000`
    }
  }

  const t = (key: string, params?: Record<string, string | number>) =>
    interpolate(
      translations[locale]?.[key] ?? translations[defaultLocale]?.[key] ?? key,
      params
    )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const stored = localStorage.getItem('arbinote-locale')
    if (stored && isLocale(stored)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocale((current) => (stored !== current ? stored : current))
    } else {
      localStorage.setItem('arbinote-locale', sanitizedInitialLocale)
    }
  }, [sanitizedInitialLocale])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
      document.documentElement.dir = dir
    }
  }, [locale, dir])

  return (
    <TranslationContext.Provider value={{ locale, dir, t, switchLocale }}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslations() {
  return useContext(TranslationContext)
}


