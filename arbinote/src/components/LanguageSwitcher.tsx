'use client'

import { useTranslations, Locale } from '@/lib/i18n'

const languages: { code: Locale; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
]

export default function LanguageSwitcher() {
  const { locale, switchLocale } = useTranslations()

  const handleLanguageChange = (newLocale: Locale) => {
    switchLocale(newLocale)
    // Recharger complètement la page pour que tous les composants se rechargent avec la nouvelle langue
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }

  return (
    <div className="flex items-center gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => handleLanguageChange(lang.code)}
          className={`px-3 py-1 rounded text-sm border transition ${
            locale === lang.code
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}


