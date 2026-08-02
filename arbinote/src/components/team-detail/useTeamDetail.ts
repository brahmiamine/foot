import { useMemo } from 'react'
import { getLocalizedName } from '@/lib/utils'
import { Team, Match } from '@/types'
import { Locale } from '@/lib/i18n'
import { RefereeStat } from './types'

export function useTeamDetail(
  team: Team,
  matches: Match[],
  refereeStats: RefereeStat[],
  locale: Locale
) {
  const displayName = getLocalizedName(locale, {
    defaultValue: team.nom,
    fr: team.nom,
    en: team.nom_en ?? team.nom,
    ar: team.nom_ar ?? team.nom,
  })

  const displayCity = team.city || team.city_ar || team.city_en
    ? getLocalizedName(locale, {
        defaultValue: team.city ?? team.city_en ?? team.city_ar ?? '',
        fr: team.city ?? undefined,
        en: team.city_en ?? undefined,
        ar: team.city_ar ?? undefined,
      })
    : null

  const displayStadium = team.stadium || team.stadium_ar
    ? getLocalizedName(locale, {
        defaultValue: team.stadium ?? team.stadium_ar ?? '',
        fr: team.stadium ?? undefined,
        ar: team.stadium_ar ?? undefined,
      })
    : null

  // Trier les stats des arbitres
  const bestReferees = useMemo(() => {
    return [...refereeStats]
      .filter(stat => stat.arbitre && stat.averageNote > 0)
      .sort((a, b) => b.averageNote - a.averageNote)
  }, [refereeStats])

  const worstReferees = useMemo(() => {
    return [...refereeStats]
      .filter(stat => stat.arbitre && stat.averageNote > 0)
      .sort((a, b) => a.averageNote - b.averageNote)
  }, [refereeStats])

  // Grouper les matchs par journée (uniquement les journées passées)
  const matchesByJournee = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const grouped = new Map<string, Match[]>()

    matches.forEach(match => {
      // Filtrer les journées futures
      const journeeDate = match.journee?.date_journee
      if (journeeDate) {
        const journeeDateObj = new Date(journeeDate)
        journeeDateObj.setHours(0, 0, 0, 0)
        if (journeeDateObj >= today) {
          return // Ignorer les journées futures
        }
      }

      const journeeId = (match.journee as any)?.id || 'unknown'
      if (!grouped.has(journeeId)) {
        grouped.set(journeeId, [])
      }
      grouped.get(journeeId)!.push(match)
    })

    // Trier les journées par date décroissante
    return Array.from(grouped.entries())
      .map(([journeeId, journeeMatches]) => {
        const sortedMatches = journeeMatches.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0
          const dateB = b.date ? new Date(b.date).getTime() : 0
          return dateB - dateA
        })
        return {
          journee: journeeMatches[0].journee as any,
          matches: sortedMatches,
        }
      })
      .sort((a, b) => {
        const dateA = a.journee?.date_journee ? new Date(a.journee.date_journee).getTime() : 0
        const dateB = b.journee?.date_journee ? new Date(b.journee.date_journee).getTime() : 0
        return dateB - dateA
      })
  }, [matches])

  return {
    displayName,
    displayCity,
    displayStadium,
    bestReferees,
    worstReferees,
    matchesByJournee,
  }
}
