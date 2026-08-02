import ContactClient from './ContactClient'
import type { Metadata } from 'next'
import { getServerLocale } from '@/lib/i18nServer'
import { getSEODescription, getSEOKeywords } from '@/lib/seo'
import StructuredData from '@/components/StructuredData'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  
  const titleFr = 'Contact | ARBINOTE - Nous contacter'
  const titleEn = 'Contact | ARBINOTE - Get in touch'
  const titleAr = 'اتصل بنا | ARBINOTE'
  
  const title = locale === 'ar' ? titleAr : locale === 'en' ? titleEn : titleFr

  const descriptionFr = 'Contactez l\'équipe ARBINOTE pour toute question, suggestion ou signalement. Nous sommes là pour vous aider et améliorer continuellement notre plateforme de notation des arbitres.'
  const descriptionEn = 'Contact the ARBINOTE team for any questions, suggestions or reports. We are here to help and continuously improve our referee rating platform.'
  const descriptionAr = 'اتصل بفريق ARBINOTE لأي أسئلة أو اقتراحات أو تقارير. نحن هنا للمساعدة وتحسين منصة تقييم الحكام باستمرار.'
  
  const description = locale === 'ar' ? descriptionAr : locale === 'en' ? descriptionEn : descriptionFr

  return {
    title,
    description,
    keywords: [
      ...getSEOKeywords(locale),
      'contact',
      'اتصل بنا',
      'support',
      'aide',
      'assistance',
      'question',
      'suggestion',
    ],
    openGraph: {
      title,
      description,
      url: `${baseUrl}/contact`,
      siteName: 'ARBINOTE',
      locale: locale === 'ar' ? 'ar_TN' : locale === 'en' ? 'en_US' : 'fr_FR',
      alternateLocale: ['fr_FR', 'en_US', 'ar_TN'],
      type: 'website',
      images: [
        {
          url: `${baseUrl}/logo-light.png`,
          width: 1200,
          height: 630,
          alt: 'Contact - ARBINOTE',
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
      canonical: `${baseUrl}/contact`,
      languages: {
        fr: `${baseUrl}/fr/contact`,
        en: `${baseUrl}/en/contact`,
        ar: `${baseUrl}/ar/contact`,
      },
    },
  }
}

export default async function ContactPage() {
  const locale = await getServerLocale()

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
        name: locale === 'ar' ? 'اتصل بنا' : locale === 'en' ? 'Contact' : 'Contact',
        item: `${baseUrl}/contact`,
      },
    ],
  }

  const contactPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: locale === 'ar' ? 'اتصل بنا' : locale === 'en' ? 'Contact' : 'Contact',
    description: locale === 'ar'
      ? 'اتصل بفريق ARBINOTE'
      : locale === 'en'
      ? 'Contact the ARBINOTE team'
      : 'Contactez l\'équipe ARBINOTE',
    url: `${baseUrl}/contact`,
    inLanguage: locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR',
  }

  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <StructuredData data={contactPageSchema} />
      <ContactClient />
    </>
  )
}
