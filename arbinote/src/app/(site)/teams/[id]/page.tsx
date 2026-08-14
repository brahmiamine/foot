import { notFound } from 'next/navigation'
import { getServerLocale, translate } from '@/lib/i18nServer'
import { fetchTeamById, fetchMatchesByTeam, fetchRefereeStatsForTeam, fetchTopMatchesForTeam, fetchCritereDefinitions, fetchVotesByMatchIds } from '@/lib/dataAccess'
import { getLocalizedName } from '@/lib/utils'
import StructuredData from '@/components/StructuredData'
import TeamDetailClient from '@/components/TeamDetailClient'
import type { Metadata } from 'next'
import { CritereDefinition, Team, Match } from '@/types'
import type { TopMatch, RefereeStat } from '@/components/team-detail/types'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const team = await fetchTeamById(id)
  const locale = await getServerLocale()

  if (!team) {
    return {
      title: 'Équipe introuvable | ARBINOTE',
    }
  }

  const displayName = getLocalizedName(locale, {
    defaultValue: team.nom,
    fr: team.nom,
    en: team.nom_en ?? team.nom,
    ar: team.nom_ar ?? team.nom,
  })

  // Récupérer quelques statistiques pour enrichir la description
  const matches = await fetchMatchesByTeam(id)
  const refereeStats = await fetchRefereeStatsForTeam(id)
  const matchCount = matches.length
  const refereeCount = refereeStats.length

  const teamTypeLabel = team.team_type === 'national' 
    ? (locale === 'ar' ? 'منتخب وطني' : locale === 'en' ? 'National team' : 'Équipe nationale')
    : (locale === 'ar' ? 'نادي' : locale === 'en' ? 'Club' : 'Club')

  const descriptionFr = `${displayName} - ${teamTypeLabel} de football. Découvrez toutes les statistiques de l'équipe : ${matchCount} match${matchCount > 1 ? 's' : ''} disputé${matchCount > 1 ? 's' : ''}, ${refereeCount} arbitre${refereeCount > 1 ? 's' : ''} différent${refereeCount > 1 ? 's' : ''}, performances des arbitres, notes moyennes, top matchs et historique complet. Analysez les performances arbitrales pour chaque match de ${displayName} sur ARBINOTE.`
  const descriptionEn = `${displayName} - ${teamTypeLabel} football team. Discover all team statistics: ${matchCount} match${matchCount > 1 ? 'es' : ''} played, ${refereeCount} different referee${refereeCount > 1 ? 's' : ''}, referee performances, average ratings, top matches and complete history. Analyze referee performances for each ${displayName} match on ARBINOTE.`
  const descriptionAr = `${displayName} - فريق كرة قدم ${teamTypeLabel}. اكتشف جميع إحصائيات الفريق: ${matchCount} مباراة، ${refereeCount} حكم${refereeCount > 1 ? ' مختلف' : ''}، أداء الحكام، التقييمات المتوسطة، أفضل المباريات والتاريخ الكامل. حلل أداء الحكام لكل مباراة ${displayName} على ARBINOTE.`

  const description = locale === 'ar' ? descriptionAr : locale === 'en' ? descriptionEn : descriptionFr

  const keywords: string[] = [
    displayName,
    team.nom,
    team.nom_en,
    team.nom_ar,
    'équipe football',
    'équipe',
    'club football',
    'équipe nationale',
    'statistiques équipe',
    'matchs équipe',
    'performance arbitres',
    'notes arbitres',
    'évaluation arbitres',
    'classement arbitres',
    'arbitrage football',
    'notation arbitres',
    'statistiques arbitres',
    'matchs disputés',
    'historique matchs',
    'ARBINOTE',
  ].filter((keyword): keyword is string => Boolean(keyword))

  return {
    title: `${displayName} | ${teamTypeLabel} | Statistiques & Matchs | ARBINOTE`,
    description,
    keywords,
    authors: [{ name: 'ARBINOTE', url: baseUrl }],
    creator: 'ARBINOTE',
    publisher: 'ARBINOTE',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: `${displayName} | ${teamTypeLabel} | ARBINOTE`,
      description,
      type: 'website',
      siteName: 'ARBINOTE',
      locale: locale === 'ar' ? 'ar_TN' : locale === 'en' ? 'en_US' : 'fr_FR',
      alternateLocale: ['fr_FR', 'en_US', 'ar_TN'],
      images: team.logo_url
        ? [
            {
              url: team.logo_url,
              width: 400,
              height: 400,
              alt: `Logo ${displayName} - ${teamTypeLabel} de football`,
              type: 'image/png',
            },
            {
              url: `${baseUrl}/logo-light.png`,
              width: 1200,
              height: 630,
              alt: `${displayName} - ARBINOTE`,
              type: 'image/png',
            },
          ]
        : [
            {
              url: `${baseUrl}/logo-light.png`,
              width: 1200,
              height: 630,
              alt: `${displayName} - ARBINOTE`,
              type: 'image/png',
            },
          ],
      url: `${baseUrl}/teams/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName} | ${teamTypeLabel} | ARBINOTE`,
      description,
      images: team.logo_url ? [team.logo_url, `${baseUrl}/logo-light.png`] : [`${baseUrl}/logo-light.png`],
      creator: '@arbinote',
      site: '@arbinote',
    },
    alternates: {
      canonical: `${baseUrl}/teams/${id}`,
      languages: {
        fr: `${baseUrl}/fr/teams/${id}`,
        en: `${baseUrl}/en/teams/${id}`,
        ar: `${baseUrl}/ar/teams/${id}`,
        'x-default': `${baseUrl}/teams/${id}`,
      },
    },
  }
}

async function getTeamData(id: string) {
  const team = await fetchTeamById(id)

  if (!team) {
    return null
  }

  const matches = await fetchMatchesByTeam(id)
  const refereeStats = await fetchRefereeStatsForTeam(id)
  const criteresDefs = (await fetchCritereDefinitions()) as CritereDefinition[]

  // Récupérer les top 5 matchs par catégorie
  const topMatchesArbitre = await fetchTopMatchesForTeam(id, 'arbitre', 5)
  const topMatchesVar = await fetchTopMatchesForTeam(id, 'var', 5)
  const topMatchesAssistant = await fetchTopMatchesForTeam(id, 'assistant', 5)

  // Calculer les notes moyennes pour chaque match
  const matchIds = matches.map(m => m.id)
  const allVotes = matchIds.length > 0 ? await fetchVotesByMatchIds(matchIds) : []
  
  const matchRatings: Record<string, { average: number; count: number }> = {}
  allVotes.forEach((vote) => {
    if (!matchRatings[vote.match_id]) {
      matchRatings[vote.match_id] = { average: 0, count: 0 }
    }
    matchRatings[vote.match_id].average += Number(vote.note_globale)
    matchRatings[vote.match_id].count += 1
  })
  
  // Finaliser les moyennes
  Object.keys(matchRatings).forEach(matchId => {
    if (matchRatings[matchId].count > 0) {
      matchRatings[matchId].average = Math.round((matchRatings[matchId].average / matchRatings[matchId].count) * 100) / 100
    }
  })

  return {
    team,
    matches,
    refereeStats,
    topMatchesArbitre,
    topMatchesVar,
    topMatchesAssistant,
    criteresDefs,
    matchRatings,
  }
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getTeamData(id)

  if (!data) {
    notFound()
  }

  const locale = await getServerLocale()
  const { team, matches, refereeStats, topMatchesArbitre, topMatchesVar, topMatchesAssistant, criteresDefs, matchRatings } = data

  const displayName = getLocalizedName(locale, {
    defaultValue: team.nom,
    fr: team.nom,
    en: team.nom_en ?? team.nom,
    ar: team.nom_ar ?? team.nom,
  })

  // Structured Data JSON-LD pour le SEO
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': team.team_type === 'national' ? 'SportsOrganization' : 'SportsTeam',
    name: displayName,
    alternateName: [team.nom_en, team.nom_ar].filter(Boolean),
    logo: team.logo_url ? {
      '@type': 'ImageObject',
      url: team.logo_url,
      width: 400,
      height: 400,
    } : `${baseUrl}/logo-light.png`,
    url: `${baseUrl}/teams/${team.id}`,
    description: locale === 'ar'
      ? `ملف ${displayName} - فريق كرة قدم. راجع الإحصائيات، المباريات، أداء الحكام وتقييمات المجتمع على ARBINOTE`
      : locale === 'en'
      ? `${displayName} profile - Football team. View statistics, matches, referee performances and community ratings on ARBINOTE`
      : `Profil de ${displayName} - Équipe de football. Consultez les statistiques, les matchs, les performances des arbitres et les notes de la communauté sur ARBINOTE`,
    sport: team.sport || 'football',
    ...(team.city && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: getLocalizedName(locale, {
          defaultValue: team.city,
          fr: team.city,
          en: team.city_en ?? team.city,
          ar: team.city_ar ?? team.city,
        }),
      },
    }),
    ...(team.stadium && {
      location: {
        '@type': 'Place',
        name: getLocalizedName(locale, {
          defaultValue: team.stadium,
          fr: team.stadium,
          ar: team.stadium_ar ?? team.stadium,
        }),
      },
    }),
  }

  // Breadcrumb Schema
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
        name: locale === 'ar' ? 'الفرق' : locale === 'en' ? 'Teams' : 'Équipes',
        item: `${baseUrl}/teams`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: displayName,
        item: `${baseUrl}/teams/${team.id}`,
      },
    ],
  }

  // ItemList Schema pour les matchs
  const matchesListSchema = matches.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: locale === 'ar' 
      ? `مباريات ${displayName}`
      : locale === 'en'
      ? `${displayName} matches`
      : `Matchs de ${displayName}`,
    description: locale === 'ar'
      ? `قائمة بجميع مباريات ${displayName} مع تقييمات الحكام`
      : locale === 'en'
      ? `List of all ${displayName} matches with referee ratings`
      : `Liste de tous les matchs de ${displayName} avec les notes des arbitres`,
    numberOfItems: matches.length,
    itemListElement: matches.slice(0, 10).map((match, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'SportsEvent',
        name: `${match.equipe_home.nom} vs ${match.equipe_away.nom}`,
        url: `${baseUrl}/matches/${match.id}`,
        ...(match.date && {
          startDate: new Date(match.date).toISOString(),
        }),
      },
    })),
  } : null

  return (
    <>
      <StructuredData data={organizationSchema} />
      <StructuredData data={breadcrumbSchema} />
      {matchesListSchema && <StructuredData data={matchesListSchema} />}
      <TeamDetailClient
        team={team as Team}
        matches={matches as Match[]}
        refereeStats={refereeStats as unknown as RefereeStat[]}
        topMatchesArbitre={topMatchesArbitre as unknown as TopMatch[]}
        topMatchesVar={topMatchesVar as unknown as TopMatch[]}
        topMatchesAssistant={topMatchesAssistant as unknown as TopMatch[]}
        criteresDefs={criteresDefs}
        matchRatings={matchRatings}
      />
    </>
  )
}

