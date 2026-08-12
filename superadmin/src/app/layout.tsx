import type { Metadata } from 'next'
import { TranslationProvider } from '@/lib/i18n'
import { getServerLocale, translate } from '@/lib/i18nServer'
import './globals.css'
import '@/assets/scss/skote-theme.scss'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return { title: translate('meta.title', locale), description: translate('meta.description', locale), robots: { index: false, follow: false } }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getServerLocale()
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body data-sidebar="dark" data-sidebar-size="lg" data-layout="vertical" data-layout-mode="light">
        <TranslationProvider initialLocale={locale}>{children}</TranslationProvider>
      </body>
    </html>
  )
}
