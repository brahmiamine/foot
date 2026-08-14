import Link from 'next/link'
import { getServerLocale, translate } from '@/lib/i18nServer'

export default async function NotFound() {
  const locale = await getServerLocale()
  const t = (key: string, params?: Record<string, string | number>) => translate(key, locale, params)

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">
        {t('notFound.title')}
      </h2>
      <p className="text-gray-600 mb-8">{t('notFound.description')}</p>
      <Link
        href="/"
        className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
      >
        {t('notFound.cta')}
      </Link>
    </div>
  )
}

