import { Metadata } from 'next'
import Link from 'next/link'
import { getServerLocale, translate } from '@/lib/i18nServer'
import { getSEODescription, getSEOKeywords } from '@/lib/seo'
import StructuredData from '@/components/StructuredData'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  
  const titleFr = 'Transparence | Comment nous luttons contre la manipulation | ARBINOTE'
  const titleEn = 'Transparency | How we fight against manipulation | ARBINOTE'
  const titleAr = 'الشفافية | كيف نحارب التلاعب | ARBINOTE'
  
  const title = locale === 'ar' ? titleAr : locale === 'en' ? titleEn : titleFr

  const descriptionFr = 'Découvrez comment ARBINOTE garantit des notes fiables et protège contre la manipulation des votes. Système de détection d\'anomalies, moyenne bayésienne, pondération intelligente et modération humaine.'
  const descriptionEn = 'Discover how ARBINOTE ensures reliable ratings and protects against vote manipulation. Anomaly detection system, Bayesian average, intelligent weighting and human moderation.'
  const descriptionAr = 'اكتشف كيف تضمن ARBINOTE تقييمات موثوقة وتحمي من التلاعب في التصويت. نظام كشف الشذوذ، المتوسط البايزي، الترجيح الذكي والرقابة البشرية.'
  
  const description = locale === 'ar' ? descriptionAr : locale === 'en' ? descriptionEn : descriptionFr

  return {
    title,
    description,
    keywords: [
      ...getSEOKeywords(locale),
      'transparence',
      'transparency',
      'الشفافية',
      'fiabilité votes',
      'détection anomalies',
      'moyenne bayésienne',
      'protection manipulation',
      'sécurité votes',
    ],
    openGraph: {
      title,
      description,
      url: `${baseUrl}/transparence`,
      siteName: 'ARBINOTE',
      locale: locale === 'ar' ? 'ar_TN' : locale === 'en' ? 'en_US' : 'fr_FR',
      alternateLocale: ['fr_FR', 'en_US', 'ar_TN'],
      type: 'website',
      images: [
        {
          url: `${baseUrl}/logo-light.png`,
          width: 1200,
          height: 630,
          alt: 'Transparence - ARBINOTE',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/logo-light.png`],
    },
    alternates: {
      canonical: `${baseUrl}/transparence`,
      languages: {
        fr: `${baseUrl}/fr/transparence`,
        en: `${baseUrl}/en/transparence`,
        ar: `${baseUrl}/ar/transparence`,
      },
    },
  }
}

export default async function TransparencePage() {
  const locale = await getServerLocale()
  const t = (key: string, params?: Record<string, string | number>) => translate(key, locale, params)

  // Structured Data JSON-LD pour le SEO
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: locale === 'ar' ? 'الرئيسية' : locale === 'en' ? 'Home' : 'Accueil',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: locale === 'ar' ? 'الشفافية' : locale === 'en' ? 'Transparency' : 'Transparence',
        item: `${baseUrl}/transparence`,
      },
    ],
  }

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: locale === 'ar' ? 'الشفافية' : locale === 'en' ? 'Transparency' : 'Transparence',
    description: locale === 'ar'
      ? 'كيف تضمن ARBINOTE تقييمات موثوقة وتحمي من التلاعب'
      : locale === 'en'
      ? 'How ARBINOTE ensures reliable ratings and protects against manipulation'
      : 'Comment ARBINOTE garantit des notes fiables et protège contre la manipulation',
    url: `${baseUrl}/transparence`,
    inLanguage: locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR',
  }

  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <StructuredData data={webPageSchema} />
      <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
      <Link
        href="/"
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-6 inline-block text-sm"
      >
        {t("common.backToHome") || "← Retour à l'accueil"}
      </Link>

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900 mb-6">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {t("transparence.header.title")}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {t("transparence.header.description")}
          </p>
        </header>

        {/* Introduction */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🎯</span> {t("transparence.intro.title")}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {(() => {
              const fullText = t("transparence.intro.text")
              const protection = t("transparence.intro.protection")
              const parts = fullText.split(protection)
              return (
                <>
                  {parts[0]}
                  <strong className="text-slate-900 dark:text-white"> {protection} </strong>
                  {parts[1]}
                </>
              )
            })()}
          </p>
        </section>

        {/* Solutions */}
        <div className="space-y-6">
          {/* 1. Moyenne Bayésienne */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {t("transparence.bayesian.title")}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-3">
                  {t("transparence.bayesian.description")}
                </p>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 text-sm">
                  <p className="text-slate-700 dark:text-slate-200">
                    <strong>{t("transparence.bayesian.howItWorks")}</strong> {t("transparence.bayesian.howItWorksText")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Détection d'anomalies */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <span className="text-2xl">🔍</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {t("transparence.anomalies.title")}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-3">
                  {t("transparence.anomalies.description")}
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-medium">🚨 {t("transparence.anomalies.extreme.title")}</span><br />
                      {t("transparence.anomalies.extreme.description")}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-medium">⏱️ {t("transparence.anomalies.coordinated.title")}</span><br />
                      {t("transparence.anomalies.coordinated.description")}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-medium">📉 {t("transparence.anomalies.identical.title")}</span><br />
                      {t("transparence.anomalies.identical.description")}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-medium">⚡ {t("transparence.anomalies.rushed.title")}</span><br />
                      {t("transparence.anomalies.rushed.description")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Pondération */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <span className="text-2xl">⚖️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {t("transparence.weighting.title")}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-3">
                  {t("transparence.weighting.description")}
                </p>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 text-sm">
                  <p className="text-slate-700 dark:text-slate-200">
                    <strong>{t("transparence.weighting.example")}</strong> {t("transparence.weighting.exampleText")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Limitation des votes */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <span className="text-2xl">🛡️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {t("transparence.protection.title")}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-3">
                  {t("transparence.protection.description")}
                </p>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    {t("transparence.protection.fingerprint")}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    {t("transparence.protection.networkLimit")}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    {t("transparence.protection.speedDetection")}
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. Modération */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                <span className="text-2xl">👁️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {t("transparence.moderation.title")}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-3">
                  {t("transparence.moderation.description")}
                </p>
                <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-4 text-sm border border-emerald-200 dark:border-emerald-800">
                  <p className="text-emerald-800 dark:text-emerald-200">
                    <strong>🔔 {t("transparence.moderation.alerts")}</strong> {t("transparence.moderation.alertsText")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 6. Score de crédibilité */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {t("transparence.credibility.title")}
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  {t("transparence.credibility.description")}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <div className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/30 dark:to-emerald-900/30 rounded-2xl p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {t("transparence.footer.title")}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              {t("transparence.footer.description")}
            </p>
            <Link 
              href="/contact" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              {t("transparence.footer.contact")}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </footer>
      </div>
      </div>
    </>
  )
}

