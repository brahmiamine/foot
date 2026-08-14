export type SuperadminLocale = 'fr' | 'ar'

export function getSuperadminLocale(value?: string): SuperadminLocale {
  return value === 'ar' ? 'ar' : 'fr'
}

export function getSuperadminDocumentAttributes(cookieValue?: string) {
  const lang = getSuperadminLocale(cookieValue)
  return { lang, dir: lang === 'ar' ? ('rtl' as const) : ('ltr' as const) }
}
