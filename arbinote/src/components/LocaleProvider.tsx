'use client'

import { useEffect } from 'react'
import { useTranslations, Locale } from '@/lib/i18n'

interface Props {
  children: React.ReactNode
}

export default function LocaleProvider({ children }: Props) {
  const { locale, switchLocale } = useTranslations()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('arbinote-locale') as Locale | null
      if (stored && stored !== locale) {
        switchLocale(stored)
      }
    }
  }, [locale, switchLocale])

  return <>{children}</>
}


