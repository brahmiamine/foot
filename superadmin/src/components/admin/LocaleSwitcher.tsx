'use client'

import { useTranslations, type Locale } from '@/lib/i18n'

export default function LocaleSwitcher() {
  const { locale, switchLocale, t } = useTranslations()
  return (
    <div className="admin-locale-switcher" role="group" aria-label={t('common.language.label')}>
      {(['fr', 'ar'] as Locale[]).map((value) => (
        <button key={value} type="button" lang={value} dir={value === 'ar' ? 'rtl' : 'ltr'}
          className={`btn btn-sm ${locale === value ? 'btn-primary' : 'btn-light border'}`}
          aria-pressed={locale === value} onClick={() => switchLocale(value)}>
          {t(`common.language.${value}`)}
        </button>
      ))}
    </div>
  )
}
