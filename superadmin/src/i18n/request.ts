import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'

export const LOCALE_COOKIE = 'arbinote-locale'
export const SUPPORTED_LOCALES = ['fr', 'ar', 'en'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]
// Alias kept for readability at call sites that used to import `Locale` from the old
// hand-rolled i18n system.
export type Locale = AppLocale
export const DEFAULT_LOCALE: AppLocale = 'fr'

export function isSupportedLocale(value: string | undefined): value is AppLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value
  const locale = isSupportedLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
