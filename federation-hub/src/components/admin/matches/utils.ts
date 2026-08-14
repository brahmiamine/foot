import type { Match, Journee } from '@/types'
import { getJourneeDisplayName } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'
import type { MatchEdit, NewMatchForm, SaisonOption } from './types'

export function toDateTimeInputValue(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`
}

export function buildEdit(match: Match): MatchEdit {
  return {
    score_home: match.score_home !== null && match.score_home !== undefined ? String(match.score_home) : '',
    score_away: match.score_away !== null && match.score_away !== undefined ? String(match.score_away) : '',
    date: toDateTimeInputValue(match.date),
    arbitre_id: match.arbitre_id ?? '',
    equipe_home: match.equipe_home?.id ?? '',
    equipe_away: match.equipe_away?.id ?? '',
  }
}

export function buildNewForm(selectedJourneeId: string): NewMatchForm {
  return {
    journee_id: selectedJourneeId,
    equipe_home: '',
    equipe_away: '',
    date: '',
    score_home: '',
    score_away: '',
    arbitre_id: '',
  }
}

// Fonction pour formater l'affichage de la journée: "Ligue - Saison (Journée)"
export function formatJourneeLabel(journee: Journee, locale: Locale): string {
  const leagueName = journee.saison?.league?.nom ?? 'Sans ligue'
  const saisonName = journee.saison?.nom ?? 'Sans saison'

  // Utiliser getJourneeDisplayName avec la locale de l'interface
  const journeeLabel = getJourneeDisplayName(journee, locale)

  return `${leagueName} - ${saisonName} (${journeeLabel})`
}

export function formatSaisonLabel(saison: SaisonOption): string {
  return `${saison.leagueNom} - ${saison.nom}`
}
