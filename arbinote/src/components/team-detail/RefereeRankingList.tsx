import { getLocalizedName, formatNote } from '@/lib/utils'
import { Locale } from '@/lib/i18n'
import { Arbitre } from '@/types'
import ArbitreLink from '../ArbitreLink'
import StarsRating from '../StarsRating'
import { RefereeStat, TFunction } from './types'

interface RefereeRankingListProps {
  referees: RefereeStat[]
  titleKey: string
  noteColorClass: string
  t: TFunction
  locale: Locale
}

export default function RefereeRankingList({ referees, titleKey, noteColorClass, t, locale }: RefereeRankingListProps) {
  if (referees.length === 0) {
    return null
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">
        {t(titleKey)}
      </h2>
      <div className="space-y-2 sm:space-y-3">
        {referees
          .filter((stat): stat is RefereeStat & { arbitre: Arbitre } => stat.arbitre !== null)
          .map((stat) => {
          const arbitreName = getLocalizedName(locale, {
            defaultValue: stat.arbitre.nom,
            fr: stat.arbitre.nom,
            en: stat.arbitre.nom_en ?? stat.arbitre.nom,
            ar: stat.arbitre.nom_ar ?? stat.arbitre.nom,
          })
          const arbitreCategory = stat.arbitre.categorie || stat.arbitre.categorie_ar
            ? getLocalizedName(locale, {
                defaultValue: stat.arbitre.categorie ?? stat.arbitre.categorie_ar ?? '',
                fr: stat.arbitre.categorie ?? undefined,
                ar: stat.arbitre.categorie_ar ?? undefined,
              })
            : null

          return (
            <div
              key={stat.arbitre.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <ArbitreLink
                    arbitreId={stat.arbitre.id}
                    photoUrl={stat.arbitre.photo_url || null}
                    name={arbitreName}
                    category={arbitreCategory}
                  />
                  <div className="mt-2 flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                    <span>
                      {stat.matchCount === 1
                        ? t('team.referee.matchCount', { count: stat.matchCount })
                        : t('team.referee.matchCount_plural', { count: stat.matchCount })}
                    </span>
                    <span>
                      {stat.voteCount === 1
                        ? t('team.referee.voteCount', { count: stat.voteCount })
                        : t('team.referee.voteCount_plural', { count: stat.voteCount })}
                    </span>
                  </div>
                </div>
                <div className="sm:ml-4 text-left sm:text-right flex-shrink-0">
                  <div className={`text-xl sm:text-2xl font-bold ${noteColorClass}`}>
                    {formatNote(stat.averageNote)}/5
                  </div>
                  <StarsRating value={stat.averageNote} readOnly size="sm" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
