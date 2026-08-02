import Link from 'next/link'
import { fetchTopMatchesByCriteres } from '@/lib/dataAccess'
import { getLocalizedName, getJourneeDisplayName } from '@/lib/utils'
import { formatDateOnly } from '@/lib/utils'

interface TopMatchesListProps {
  matchIds: string[]
  category: 'var' | 'assistant'
  locale: string
  t: (key: string, params?: Record<string, string | number>) => string
}

export default async function TopMatchesList({ matchIds, category, locale, t }: TopMatchesListProps) {
  const topMatches = await fetchTopMatchesByCriteres(matchIds, category, 5)

  if (topMatches.length === 0) {
    return (
      <p className="text-sm text-gray-500">{t('classement.noMatchesForCategory')}</p>
    )
  }

  return (
    <ul className="space-y-3">
      {topMatches.map((item, index) => {
        const match = item.match
        const homeTeam = match.equipe_home
        const awayTeam = match.equipe_away
        const journee = match.journee

        const homeName = getLocalizedName(locale, {
          defaultValue: homeTeam.nom,
          fr: homeTeam.nom,
          en: homeTeam.nom_en ?? homeTeam.nom,
          ar: homeTeam.nom_ar ?? homeTeam.nom,
        })
        const awayName = getLocalizedName(locale, {
          defaultValue: awayTeam.nom,
          fr: awayTeam.nom,
          en: awayTeam.nom_en ?? awayTeam.nom,
          ar: awayTeam.nom_ar ?? awayTeam.nom,
        })

        const hasScore =
          match.score_home !== null &&
          match.score_home !== undefined &&
          match.score_away !== null &&
          match.score_away !== undefined

        return (
          <li key={match.id} className="rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 px-3 sm:px-4 py-2 sm:py-3 hover:border-blue-200 dark:hover:border-blue-700 transition bg-white dark:bg-gray-800">
            <Link href={`/matches/${match.id}`} className="block">
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">#{index + 1}</span>
                  {journee && (
                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 shrink-0">
                      {getJourneeDisplayName(journee, locale)}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{item.average.toFixed(2)}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t('common.globalNote')}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white break-words line-clamp-2">{homeName}</span>
                </div>
                <div className="shrink-0 text-center">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {hasScore ? `${match.score_home} - ${match.score_away}` : 'VS'}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-right sm:text-left">
                  <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white break-words line-clamp-2">{awayName}</span>
                </div>
              </div>
              {match.date && (
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatDateOnly(match.date, locale)}
                </p>
              )}
              <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t('classement.voteCount', { count: item.voteCount })}
              </p>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}


