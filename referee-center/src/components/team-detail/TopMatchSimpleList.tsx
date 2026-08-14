import Image from 'next/image'
import Link from 'next/link'
import { getLocalizedName, formatDate, formatNote, getJourneeDisplayName } from '@/lib/utils'
import { Locale } from '@/lib/i18n'
import { TopMatch, TFunction } from './types'

interface TopMatchSimpleListProps {
  items: TopMatch[]
  titleKey: string
  noteColorClass: string
  containerClassName?: string
  t: TFunction
  locale: Locale
}

export default function TopMatchSimpleList({ items, titleKey, noteColorClass, containerClassName, t, locale }: TopMatchSimpleListProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className={containerClassName}>
      <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-gray-800 dark:text-gray-200">
        {t(titleKey)}
      </h3>
      <div className="space-y-2">
        {items.map((item, index) => {
          const homeName = getLocalizedName(locale, {
            defaultValue: item.match.equipe_home.nom,
            fr: item.match.equipe_home.nom,
            en: item.match.equipe_home.nom_en ?? item.match.equipe_home.nom,
            ar: item.match.equipe_home.nom_ar ?? item.match.equipe_home.nom,
          })
          const awayName = getLocalizedName(locale, {
            defaultValue: item.match.equipe_away.nom,
            fr: item.match.equipe_away.nom,
            en: item.match.equipe_away.nom_en ?? item.match.equipe_away.nom,
            ar: item.match.equipe_away.nom_ar ?? item.match.equipe_away.nom,
          })
          const journeeLabel = item.match.journee ? getJourneeDisplayName(item.match.journee, locale) : null

          return (
            <Link
              key={item.match.id}
              href={`/matches/${item.match.id}`}
              className="block border border-gray-200 dark:border-gray-700 rounded-lg p-2 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">#{index + 1}</span>
                    {/* Logo équipe home */}
                    {item.match.equipe_home.logo_url ? (
                      <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0">
                        <Image
                          src={item.match.equipe_home.logo_url}
                          alt={`Logo ${homeName}`}
                          fill
                          sizes="(max-width: 640px) 20px, 24px"
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-gray-400 flex-shrink-0">
                        {homeName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm truncate">{homeName}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm flex-shrink-0">vs</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm truncate">{awayName}</span>
                    {/* Logo équipe away */}
                    {item.match.equipe_away.logo_url ? (
                      <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0">
                        <Image
                          src={item.match.equipe_away.logo_url}
                          alt={`Logo ${awayName}`}
                          fill
                          sizes="(max-width: 640px) 20px, 24px"
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-gray-400 flex-shrink-0">
                        {awayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Journée */}
                    {journeeLabel && (
                      <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {journeeLabel}
                      </span>
                    )}
                    {item.match.date && (
                      <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(item.match.date, locale)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="sm:ml-4 text-left sm:text-right flex-shrink-0">
                  <div className={`text-base sm:text-lg font-bold ${noteColorClass}`}>
                    {formatNote(item.average)}/5
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                    {item.voteCount === 1
                      ? t('team.referee.voteCount', { count: item.voteCount })
                      : t('team.referee.voteCount_plural', { count: item.voteCount })}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
