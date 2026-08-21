import { notFound } from 'next/navigation'
import StarsRating from '@/components/StarsRating'
import { formatDate, formatNote, getLocalizedName, getJourneeDisplayName } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { Vote, Criteres, Match as MatchType, CritereDefinition, Arbitre as ArbitreType } from '@/types'
import { getServerLocale, translate } from '@/lib/i18nServer'
import { fetchArbitreById, fetchVotesByArbitre, fetchMatchesByArbitre, fetchVotesByMatchIds, fetchCritereDefinitions } from '@/lib/dataAccess'
import { isScorePubliclyVisible } from '@/lib/votingPolicy'
import { ArbiNoteVotingPolicyService } from '@/lib/votingPolicyService'
import StructuredData from '@/components/StructuredData'
import type { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const arbitre = await fetchArbitreById(id)
  const locale = await getServerLocale()

  if (!arbitre) {
    return {
      title: 'Arbitre introuvable | ARBINOTE',
    }
  }

  const displayName = getLocalizedName(locale, {
    defaultValue: arbitre.nom,
    fr: arbitre.nom,
    en: arbitre.nom_en ?? arbitre.nom,
    ar: arbitre.nom_ar ?? arbitre.nom,
  })

  const descriptionFr = `Profil de ${displayName} - Arbitre de football professionnel. Consultez les statistiques, les notes moyennes, les matchs arbitrés et les votes de la communauté internationale.`
  const descriptionEn = `${displayName} profile - Professional football referee. View statistics, average ratings, officiated matches and international community votes.`
  const descriptionAr = `ملف ${displayName} - حكم كرة قدم محترف. راجع الإحصائيات، المعدلات المتوسطة، المباريات المحكمة وتصويتات المجتمع الدولي.`

  const description = locale === 'ar' ? descriptionAr : locale === 'en' ? descriptionEn : descriptionFr

  return {
    title: `${displayName} | Arbitre Ligue 1 | ARBINOTE`,
    description,
    keywords: [
      displayName,
      'arbitre',
      'arbitre football',
      'notation arbitre',
      'statistiques arbitre',
      'performance arbitre',
      'matchs arbitrés',
      'votes arbitre',
      'classement arbitres',
      'arbitrage professionnel',
      'arbitre international',
    ],
    openGraph: {
      title: `${displayName} | ARBINOTE`,
      description,
      type: 'profile',
      images: arbitre.photo_url
        ? [
            {
              url: arbitre.photo_url,
              width: 400,
              height: 400,
              alt: `Photo de ${displayName}`,
            },
          ]
        : [
            {
              url: `${baseUrl}/logo-light.png`,
              width: 1200,
              height: 630,
              alt: `${displayName} - ARBINOTE`,
            },
          ],
      url: `${baseUrl}/arbitres/${id}`,
    },
    twitter: {
      card: 'summary',
      title: `${displayName} | ARBINOTE`,
      description,
      images: arbitre.photo_url ? [arbitre.photo_url] : [`${baseUrl}/logo-light.png`],
    },
    alternates: {
      canonical: `${baseUrl}/arbitres/${id}`,
      languages: {
        fr: `${baseUrl}/fr/arbitres/${id}`,
        en: `${baseUrl}/en/arbitres/${id}`,
        ar: `${baseUrl}/ar/arbitres/${id}`,
      },
    },
  }
}

async function getArbitreStats(id: string) {
  // Récupérer l'arbitre
  const arbitre = await fetchArbitreById(id)

  if (!arbitre) {
    return null
  }

  // Récupérer les définitions de critères depuis la base de données
  const criteresDefs = (await fetchCritereDefinitions()) as CritereDefinition[]
  
  // Filtrer uniquement les critères de la catégorie "arbitre"
  const arbitreCriteres = criteresDefs.filter(c => c.categorie === 'arbitre')

  // Calculer les statistiques des votes
  const votes = (await fetchVotesByArbitre(id)) as Vote[]

  const nombreVotes = votes?.length || 0
  const moyenneNote =
    nombreVotes > 0
      ? votes.reduce((sum, v) => sum + Number(v.note_globale), 0) / nombreVotes
      : 0

  // Statistiques par critère - utiliser les critères de la DB
  const criteriaIds = arbitreCriteres.map(c => c.id)
  const statsCriteres: Record<string, number> = {}
  
  // Initialiser tous les critères à 0
  criteriaIds.forEach(id => {
    statsCriteres[id] = 0
  })

  if (votes && votes.length > 0) {
    votes.forEach((vote) => {
      const criteres = vote.criteres as Record<string, number>
      if (criteres) {
        criteriaIds.forEach(id => {
          statsCriteres[id] += criteres[id] || 0
        })
      }
    })

    // Calculer les moyennes
    criteriaIds.forEach(id => {
      statsCriteres[id] = statsCriteres[id] / nombreVotes
    })
  }

  // Récupérer les matchs de l'arbitre
  const matches = await fetchMatchesByArbitre(id)
  
  // Récupérer les votes pour chaque match afin de calculer les moyennes
  const matchIds = matches.map((m) => m.id)
  const allMatchVotes = matchIds.length > 0 ? await fetchVotesByMatchIds(matchIds) : []

  // Calculer la note moyenne par match
  const matchRatings: Record<string, { average: number; count: number }> = {}
  allMatchVotes.forEach((vote) => {
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

  // ARBI-002 : le score agrégé n'est publiquement visible qu'à partir du
  // seuil configuré — le nombre de votes reste affiché pour expliquer
  // pourquoi la note est encore masquée.
  const votingPolicy = await new ArbiNoteVotingPolicyService().resolve()
  const scoreVisible = isScorePubliclyVisible(nombreVotes, votingPolicy)

  return {
    arbitre,
    stats: {
      nombre_votes: nombreVotes,
      moyenne_note: scoreVisible ? Math.round(moyenneNote * 100) / 100 : 0,
      moyenne_criteres: scoreVisible ? statsCriteres : Object.fromEntries(criteriaIds.map((critereId) => [critereId, 0])),
      score_visible: scoreVisible,
      minimum_votes_before_visible: votingPolicy.minimumVotesBeforeScoreVisible,
    },
    matches: matches || [],
    matchRatings,
    criteresDefs: arbitreCriteres,
  }
}

export default async function ArbitrePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getArbitreStats(id)

  if (!data) {
    notFound()
  }

  const locale = await getServerLocale()
  const t = (key: string, params?: Record<string, string | number>) => translate(key, locale, params)
  const { stats, matches, matchRatings, criteresDefs } = data
  const arbitre = data.arbitre as unknown as ArbitreType
  const displayName = getLocalizedName(locale, {
    defaultValue: arbitre.nom,
    fr: arbitre.nom,
    en: arbitre.nom_en ?? undefined,
    ar: arbitre.nom_ar ?? undefined,
  })
  const displayCategory =
    arbitre.categorie || arbitre.categorie_ar
      ? getLocalizedName(locale, {
          defaultValue: arbitre.categorie ?? arbitre.categorie_ar ?? '',
          fr: arbitre.categorie ?? undefined,
          ar: arbitre.categorie_ar ?? undefined,
        })
      : null
  const displayNationality =
    arbitre.nationalite || arbitre.nationalite_ar
      ? getLocalizedName(locale, {
          defaultValue: arbitre.nationalite ?? arbitre.nationalite_ar ?? '',
          fr: arbitre.nationalite ?? undefined,
          ar: arbitre.nationalite_ar ?? undefined,
        })
      : null

  // Structured Data JSON-LD pour le SEO
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: displayName,
    jobTitle: displayCategory || 'Arbitre de football',
    nationality: displayNationality || 'Tunisie',
    image: arbitre.photo_url || `${baseUrl}/logo-light.png`,
    url: `${baseUrl}/arbitres/${arbitre.id}`,
    sameAs: [],
    description: locale === 'ar'
      ? `حكم كرة القدم ${displayName} - منصة ARBINOTE الدولية`
      : locale === 'en'
      ? `Football referee ${displayName} - ARBINOTE International Platform`
      : `Arbitre de football ${displayName} - Plateforme internationale ARBINOTE`,
  }

  const aggregateRatingSchema = stats.moyenne_note > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'AggregateRating',
        itemReviewed: {
          '@type': 'Person',
          name: displayName,
        },
        ratingValue: stats.moyenne_note,
        bestRating: 5,
        worstRating: 1,
        ratingCount: stats.nombre_votes,
      }
    : null

  return (
    <>
      <StructuredData data={personSchema} />
      {aggregateRatingSchema && <StructuredData data={aggregateRatingSchema} />}
      <div className="max-w-4xl mx-auto">
      <Link
        href="/classement"
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 inline-block"
      >
        {t('arbitre.back')}
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-start gap-6 mb-6">
          <div className="flex-shrink-0">
            {arbitre.photo_url ? (
              <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700 shadow-lg">
                <Image
                  src={arbitre.photo_url}
                  alt={`Photo ${displayName}`}
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-40 h-40 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center text-4xl font-semibold border-4 border-blue-200 dark:border-blue-800 shadow-lg">
                {displayName
                  .split(' ')
                  .map((part: string) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">{displayName}</h1>
            <div className="space-y-3 text-gray-600 dark:text-gray-400">
              {displayCategory && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t('arbitre.category')}:</span>
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-md text-sm font-medium">
                    {displayCategory}
                  </span>
                </div>
              )}
              {displayNationality && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t('arbitre.nationality')}:</span>
                  <span className="text-gray-700 dark:text-gray-300">🇹🇳 {displayNationality}</span>
                </div>
              )}
              {arbitre.date_naissance && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t('arbitre.birthDate')}:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {new Date(arbitre.date_naissance).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">{t('arbitre.averageNote')}</div>
            <div className="text-4xl font-bold text-blue-900 dark:text-blue-200">
              {stats.moyenne_note > 0 ? formatNote(stats.moyenne_note) : 'N/A'}
              {stats.moyenne_note > 0 && <span className="text-2xl">/5</span>}
            </div>
            {!stats.score_visible && stats.nombre_votes > 0 && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {stats.nombre_votes}/{stats.minimum_votes_before_visible}
              </div>
            )}
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="text-sm text-green-600 dark:text-green-400 mb-1">{t('arbitre.voteCount')}</div>
            <div className="text-4xl font-bold text-green-900 dark:text-green-200">
              {stats.nombre_votes}
            </div>
          </div>
        </div>
      </div>

      {stats.moyenne_note > 0 && criteresDefs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t('arbitre.criteriaTitle')}</h2>
          <div className="space-y-4">
            {criteresDefs.map((critere) => {
              const label = locale === 'ar' ? critere.label_ar : locale === 'en' ? critere.label_en ?? critere.label_fr : critere.label_fr
              const value = stats.moyenne_criteres[critere.id] || 0
              
              return (
                <div key={critere.id}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{label}</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {formatNote(value)}/5
                    </span>
                  </div>
                  <StarsRating
                    value={value}
                    readOnly
                    size="md"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {matches.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t('arbitre.matchesTitle')}</h2>
          <div className="space-y-3">
            {matches.map((match) => {
              const homeName = getLocalizedName(locale, {
                defaultValue: match.equipe_home.nom,
                fr: match.equipe_home.nom,
                en: match.equipe_home.nom_en ?? undefined,
                ar: match.equipe_home.nom_ar ?? undefined,
              })
              const awayName = getLocalizedName(locale, {
                defaultValue: match.equipe_away.nom,
                fr: match.equipe_away.nom,
                en: match.equipe_away.nom_en ?? undefined,
                ar: match.equipe_away.nom_ar ?? undefined,
              })
              const matchRating = matchRatings[match.id]
              
              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="block border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{homeName}</span>
                        <span className="text-gray-400 dark:text-gray-500">vs</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{awayName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                        {match.date && (
                          <span>{formatDate(match.date, locale)}</span>
                        )}
                        {match.journee && (
                          <span>
                            {getJourneeDisplayName(match.journee, locale)}
                          </span>
                        )}
                        {match.score_home !== null && match.score_away !== null && (
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {match.score_home} - {match.score_away}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {matchRating && matchRating.count > 0 && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {formatNote(matchRating.average)}/5
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {matchRating.count} {matchRating.count > 1 ? t('arbitre.votes') : t('arbitre.vote')}
                          </div>
                        </div>
                      )}
                      <div className="text-blue-600 dark:text-blue-400">→</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
      </div>
    </>
  )
}

