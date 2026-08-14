import Link from 'next/link'
import { notFound } from 'next/navigation'
import MatchCardClient from '@/components/MatchCardClient'
import RankingTable from '@/components/RankingTable'
import { buildRanking } from '@/lib/rankings'
import { CritereDefinition, Journee, Match, Vote } from '@/types'
import { getServerLocale, translate } from '@/lib/i18nServer'
import { getLocalizedName, getJourneeDisplayName } from '@/lib/utils'
import {
  fetchCritereDefinitions,
  fetchJourneeWithSeason,
  fetchMatchesByJournee,
  fetchVotesByMatchIds,
  fetchFederationsWithLeagues,
} from '@/lib/dataAccess'
import { getMatchCredibility } from '@/lib/matchCredibility'
import { getDataSource } from '@/lib/db'
import { Vote as VoteEntity } from '@/lib/entities'
import type { Metadata } from 'next'
import StructuredData from '@/components/StructuredData'
import JourneePageClient from '@/components/JourneePageClient'
import { ShareBrandingInfo } from '@/components/MatchShareCard'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

async function getJournee(id: string): Promise<Journee & { saison?: { id: string; nom: string } } | null> {
  return (await fetchJourneeWithSeason(id)) as (Journee & { saison?: { id: string; nom: string } }) | null
}

async function getMatches(journeeId: string): Promise<Match[]> {
  return (await fetchMatchesByJournee(journeeId)) as Match[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const journee = await getJournee(id)
  const locale = await getServerLocale()

  if (!journee) {
    return {
      title: 'Journée introuvable | ARBINOTE',
    }
  }

  const journeeName = getJourneeDisplayName(journee, locale)
  const saisonName = journee.saison?.nom || ''

  const title = saisonName
    ? `${journeeName} - ${saisonName} | ARBINOTE`
    : `${journeeName} | ARBINOTE`

  const descriptionFr = `Consultez les matchs et le classement des arbitres pour ${journeeName}${saisonName ? ` - ${saisonName}` : ''}. Découvrez les résultats, les votes et les performances des arbitres pour cette journée.`
  const descriptionEn = `View matches and referee rankings for ${journeeName}${saisonName ? ` - ${saisonName}` : ''}. Discover results, votes and referee performances for this matchday.`
  const descriptionAr = `اطلع على المباريات وترتيب الحكام لـ ${journeeName}${saisonName ? ` - ${saisonName}` : ''}. اكتشف النتائج، التصويتات وأداء الحكام لهذه الجولة.`

  const description = locale === 'ar' ? descriptionAr : locale === 'en' ? descriptionEn : descriptionFr

  return {
    title,
    description,
    keywords: [
      journeeName,
      saisonName,
      'journée',
      'matchday',
      'classement arbitres',
      'matchs football',
      'résultats matchs',
      'notation arbitres',
    ],
    openGraph: {
      title,
      description,
      url: `${baseUrl}/journees/${id}`,
      siteName: 'ARBINOTE',
      locale: locale === 'ar' ? 'ar_TN' : locale === 'en' ? 'en_US' : 'fr_FR',
      alternateLocale: ['fr_FR', 'en_US', 'ar_TN'],
      type: 'website',
      images: [
        {
          url: `${baseUrl}/logo-light.png`,
          width: 1200,
          height: 630,
          alt: `${journeeName} - ARBINOTE`,
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
      canonical: `${baseUrl}/journees/${id}`,
      languages: {
        fr: `${baseUrl}/fr/journees/${id}`,
        en: `${baseUrl}/en/journees/${id}`,
        ar: `${baseUrl}/ar/journees/${id}`,
      },
    },
  }
}

export default async function JourneePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const journee = await getJournee(id)

  if (!journee) {
    notFound()
  }

  const locale = await getServerLocale()
  const t = (key: string, params?: Record<string, string | number>) => translate(key, locale, params)
  const matches = await getMatches(id)
  const matchIds = matches.map((m) => m.id)

  const votes = (await fetchVotesByMatchIds(matchIds)) as Vote[]

  const criteresDefinitions = (await fetchCritereDefinitions()) as unknown as CritereDefinition[]

  const definitions = criteresDefinitions as CritereDefinition[]
  const varCriteres = definitions.filter((c) => c.categorie === 'var')
  const assistantCriteres = definitions.filter((c) => c.categorie === 'assistant')

  // Récupérer la crédibilité et le nombre de votes pour chaque match
  const dataSource = await getDataSource()
  const voteRepo = dataSource.getRepository<VoteEntity>('votes')
  const votesByMatch = await Promise.all(
    matchIds.map(async (matchId) => {
      const matchVotes = await voteRepo.find({
        where: { match_id: matchId },
        select: ['id'],
      })
      return { matchId, totalVotes: matchVotes.length }
    })
  )
  const totalVotesMap = new Map(
    votesByMatch.map((v) => [v.matchId, v.totalVotes])
  )

  const credibilityPromises = matchIds.map(async (matchId) => {
    const credibility = await getMatchCredibility(matchId)
    return { matchId, credibility }
  })
  const credibilityResults = await Promise.all(credibilityPromises)
  const credibilityMap = new Map(
    credibilityResults.map((r) => [r.matchId, r.credibility])
  )

  // Ajouter crédibilité et total votes aux matches
  const matchesWithCredibility = matches.map((match) => ({
    ...match,
    credibility: credibilityMap.get(match.id) ?? null,
    totalVotes: totalVotesMap.get(match.id) ?? 0,
  }))

  // Récupérer le meilleur arbitre (basé sur note globale)
  const refereeRanking = buildRanking(votes, {
    criteres: definitions.filter((c) => c.categorie === 'arbitre'),
    includeCategories: ['arbitre'],
  })

  // Classement global basé sur la note globale
  const globalRanking = buildRanking(votes, {
    criteres: definitions,
    includeCategories: ['arbitre', 'var', 'assistant'],
  })

  // Calculer les notes moyennes VAR et assistants pour la journée
  const calculateCategoryAverage = (category: string) => {
    const categoryCriteres = definitions.filter((c) => c.categorie === category)
    if (!categoryCriteres.length) return null

    const perVoteAverages: number[] = []

    votes.forEach((vote) => {
      if (!vote.criteres || typeof vote.criteres !== 'object') return
      const values = categoryCriteres
        .map((critere) => vote.criteres?.[critere.id])
        .filter((value): value is number => typeof value === 'number' && value > 0)

      if (values.length) {
        const sum = values.reduce((acc, val) => acc + val, 0)
        perVoteAverages.push(sum / values.length)
      }
    })

    if (!perVoteAverages.length) return null

    const sum = perVoteAverages.reduce((acc, val) => acc + val, 0)
    return Math.round((sum / perVoteAverages.length) * 100) / 100
  }

  const varAverage = calculateCategoryAverage('var')
  const assistantAverage = calculateCategoryAverage('assistant')

  // Récupérer le branding pour le partage
  const federations = await fetchFederationsWithLeagues()
  let shareBranding: ShareBrandingInfo | null = null
  if (journee.saison?.league_id) {
    for (const fed of federations) {
      const league = fed.leagues?.find((l) => l.id === journee.saison?.league_id)
      if (league) {
        shareBranding = {
          leagueName: getLocalizedName(locale, {
            defaultValue: league.nom,
            fr: league.nom,
            en: league.nom_en ?? league.nom,
            ar: league.nom_ar ?? league.nom,
          }),
          leagueLogoUrl: league.logo_url || null,
          federationName: getLocalizedName(locale, {
            defaultValue: fed.nom,
            fr: fed.nom,
            en: fed.nom_en ?? fed.nom,
            ar: fed.nom_ar ?? fed.nom,
          }),
          federationLogoUrl: fed.logo_url || null,
        }
        break
      }
    }
  }

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
        name: getJourneeDisplayName(journee, locale),
        item: `${baseUrl}/journees/${id}`,
      },
    ],
  }

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: getJourneeDisplayName(journee, locale),
    description: locale === 'ar'
      ? `مباريات وترتيب الحكام لـ ${getJourneeDisplayName(journee, locale)}`
      : locale === 'en'
      ? `Matches and referee rankings for ${getJourneeDisplayName(journee, locale)}`
      : `Matchs et classement des arbitres pour ${getJourneeDisplayName(journee, locale)}`,
    url: `${baseUrl}/journees/${id}`,
    inLanguage: locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR',
  }

  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <StructuredData data={webPageSchema} />
      <JourneePageClient
        journee={journee}
        matches={matchesWithCredibility}
        refereeRanking={refereeRanking}
        globalRanking={globalRanking}
        varAverage={varAverage}
        assistantAverage={assistantAverage}
        totalVotes={votes.length}
        criteresDefinitions={definitions}
        shareBranding={shareBranding}
      />
    </>
  )
}


