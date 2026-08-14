import Image from 'next/image'
import Link from 'next/link'
import { getLocalizedName, formatDate, formatNote, getJourneeDisplayName } from '@/lib/utils'
import { Locale } from '@/lib/i18n'
import type { useTeamDetail } from './useTeamDetail'
import { TFunction } from './types'

interface MatchesTabContentProps {
  matchesByJournee: ReturnType<typeof useTeamDetail>['matchesByJournee']
  matchRatings: Record<string, { average: number; count: number }>
  t: TFunction
  locale: Locale
}

export default function MatchesTabContent({ matchesByJournee, matchRatings, t, locale }: MatchesTabContentProps) {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">
        {t('team.matches.title')}
      </h2>
      {matchesByJournee.length > 0 ? (
        <div className="space-y-4 sm:space-y-6">
          {matchesByJournee.map(({ journee, matches: journeeMatches }) => {
            const journeeLabel = journee ? getJourneeDisplayName(journee, locale) : t('team.matches.unknownJournee')
            const journeeDate = journee?.date_journee ? formatDate(journee.date_journee, locale) : null

            return (
              <div key={journee?.id || 'unknown'} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
                <div className="mb-2 sm:mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{journeeLabel}</h3>
                  {journeeDate && (
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{journeeDate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  {journeeMatches.map((match) => {
                    const currentJourneeLabel = journee ? getJourneeDisplayName(journee, locale) : null
                    const homeName = getLocalizedName(locale, {
                      defaultValue: match.equipe_home.nom,
                      fr: match.equipe_home.nom,
                      en: match.equipe_home.nom_en ?? match.equipe_home.nom,
                      ar: match.equipe_home.nom_ar ?? match.equipe_home.nom,
                    })
                    const awayName = getLocalizedName(locale, {
                      defaultValue: match.equipe_away.nom,
                      fr: match.equipe_away.nom,
                      en: match.equipe_away.nom_en ?? match.equipe_away.nom,
                      ar: match.equipe_away.nom_ar ?? match.equipe_away.nom,
                    })
                    const refereeName = match.arbitre
                      ? getLocalizedName(locale, {
                          defaultValue: match.arbitre.nom,
                          fr: match.arbitre.nom,
                          en: match.arbitre.nom_en ?? match.arbitre.nom,
                          ar: match.arbitre.nom_ar ?? match.arbitre.nom,
                        })
                      : null
                    const matchRating = matchRatings[match.id]

                    return (
                      <Link
                        key={match.id}
                        href={`/matches/${match.id}`}
                        className="block border border-gray-200 dark:border-gray-700 rounded-lg p-2 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
                              {/* Logo équipe home */}
                              {match.equipe_home.logo_url ? (
                                <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0">
                                  <Image
                                    src={match.equipe_home.logo_url}
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
                              {match.score_home !== null && match.score_away !== null ? (
                                <span className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm flex-shrink-0">
                                  {match.score_home} - {match.score_away}
                                </span>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm flex-shrink-0">vs</span>
                              )}
                              <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm truncate">{awayName}</span>
                              {/* Logo équipe away */}
                              {match.equipe_away.logo_url ? (
                                <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0">
                                  <Image
                                    src={match.equipe_away.logo_url}
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
                              {/* Arbitre avec logo */}
                              {match.arbitre && refereeName && (
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  {match.arbitre.photo_url ? (
                                    <div className="relative w-4 h-4 sm:w-5 sm:h-5 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
                                      <Image
                                        src={match.arbitre.photo_url}
                                        alt={`Photo ${refereeName}`}
                                        fill
                                        sizes="(max-width: 640px) 16px, 20px"
                                        className="object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[9px] sm:text-[10px] font-semibold text-gray-600 dark:text-gray-400 flex-shrink-0">
                                      {refereeName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">{refereeName}</span>
                                </div>
                              )}
                              {/* Journée */}
                              {currentJourneeLabel && (
                                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                                  {currentJourneeLabel}
                                </span>
                              )}
                              {match.date && (
                                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(match.date, locale)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="sm:ml-4 text-left sm:text-right flex-shrink-0">
                            {matchRating && matchRating.count > 0 ? (
                              <>
                                <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
                                  {formatNote(matchRating.average)}/5
                                </div>
                                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                                  {matchRating.count} {matchRating.count === 1 ? t('team.referee.voteCount', { count: matchRating.count }) : t('team.referee.voteCount_plural', { count: matchRating.count })}
                                </div>
                              </>
                            ) : (
                              <div className="text-blue-600 dark:text-blue-400">→</div>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">{t('team.matches.empty')}</p>
      )}
    </div>
  )
}
