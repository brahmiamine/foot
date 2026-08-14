'use client'

import { TranslationProvider, Locale as ClientLocale } from '@/lib/i18n'
import LocaleProvider from '@/components/LocaleProvider'
import { VoteProvider } from '@/contexts/VoteContext'

interface Props {
  children: React.ReactNode
  initialLocale: ClientLocale
}

export default function Providers({ children, initialLocale }: Props) {
  return (
    <TranslationProvider initialLocale={initialLocale}>
      <VoteProvider>
        <LocaleProvider>{children}</LocaleProvider>
      </VoteProvider>
    </TranslationProvider>
  )
}


