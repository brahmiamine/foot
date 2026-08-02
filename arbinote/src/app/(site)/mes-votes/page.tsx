import MesVotesClient from '@/components/MesVotesClient'
import { fetchCritereDefinitions } from '@/lib/dataAccess'
import { CritereDefinition } from '@/types'
import type { Metadata } from 'next'
import { getServerLocale } from '@/lib/i18nServer'
import { getSEODescription, getSEOKeywords } from '@/lib/seo'
import StructuredData from '@/components/StructuredData'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  
  const titleFr = 'Mes Votes | ARBINOTE - Historique de vos votes'
  const titleEn = 'My Votes | ARBINOTE - Your voting history'
  const titleAr = 'تصويتاتي | ARBINOTE - تاريخ تصويتاتك'
  
  const title = locale === 'ar' ? titleAr : locale === 'en' ? titleEn : titleFr

  const descriptionFr = 'Consultez l\'historique de tous vos votes sur ARBINOTE. Retrouvez les matchs pour lesquels vous avez voté, vos notes et vos évaluations des arbitres.'
  const descriptionEn = 'View your complete voting history on ARBINOTE. Find all matches you voted on, your ratings and referee evaluations.'
  const descriptionAr = 'اطلع على تاريخ تصويتاتك الكامل على ARBINOTE. اعثر على جميع المباريات التي صوّتت عليها، تقييماتك وتقييمات الحكام.'
  
  const description = locale === 'ar' ? descriptionAr : locale === 'en' ? descriptionEn : descriptionFr

  return {
    title,
    description,
    keywords: [
      ...getSEOKeywords(locale),
      'mes votes',
      'my votes',
      'تصويتاتي',
      'historique votes',
      'votes personnels',
      'évaluations personnelles',
    ],
    robots: {
      index: false, // Page personnelle, ne pas indexer
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/mes-votes`,
      siteName: 'ARBINOTE',
      locale: locale === 'ar' ? 'ar_TN' : locale === 'en' ? 'en_US' : 'fr_FR',
      alternateLocale: ['fr_FR', 'en_US', 'ar_TN'],
      type: 'website',
      images: [
        {
          url: `${baseUrl}/logo-light.png`,
          width: 1200,
          height: 630,
          alt: 'Mes Votes - ARBINOTE',
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
      canonical: `${baseUrl}/mes-votes`,
      languages: {
        fr: `${baseUrl}/fr/mes-votes`,
        en: `${baseUrl}/en/mes-votes`,
        ar: `${baseUrl}/ar/mes-votes`,
      },
    },
  }
}

export default async function MesVotesPage() {
  const locale = await getServerLocale()
  const criteresDefinitions = (await fetchCritereDefinitions()) as unknown as CritereDefinition[]

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
        name: locale === 'ar' ? 'تصويتاتي' : locale === 'en' ? 'My Votes' : 'Mes Votes',
        item: `${baseUrl}/mes-votes`,
      },
    ],
  }

  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <MesVotesClient criteresDefs={criteresDefinitions} />
    </>
  )
}

