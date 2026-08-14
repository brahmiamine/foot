/**
 * Logique pour déterminer la journée en cours :
 * 1. Si date_journee == aujourd'hui → afficher cette journée
 * 2. Sinon → afficher la journée précédente (la plus récente avant aujourd'hui)
 * 3. Si aucune journée passée → afficher la prochaine journée future
 */

import { getDataSource } from './db'
import { Journee, Match } from './entities'
import { toPlain } from './serialization'

export interface JourneeWithWindows {
  id: string
  numero: number
  saison_id: string
  date_journee?: string | null
  first_match_date: string | null
  last_match_date: string | null
  start_window: string | null
  end_window: string | null
}

/**
 * Récupère toutes les journées avec leurs dates de premier et dernier match
 * Requête SQL optimisée
 */
export async function fetchJourneesWithMatchDates(leagueId?: string | null): Promise<JourneeWithWindows[]> {
  const dataSource = await getDataSource()
  
  // Requête SQL pour récupérer journées avec dates min/max des matchs
  // Compatible MySQL/MariaDB
  let query = `
    SELECT 
      j.id,
      j.numero,
      j.saison_id,
      j.date_journee,
      MIN(m.date) as first_match_date,
      MAX(m.date) as last_match_date
    FROM journees j
    LEFT JOIN matches m ON m.journee_id = j.id
    LEFT JOIN saisons s ON s.id = j.saison_id
  `
  
  const params: string[] = []
  if (leagueId) {
    query += ` WHERE s.league_id = ?`
    params.push(leagueId)
  }

  query += ` GROUP BY j.id, j.numero, j.saison_id, j.date_journee ORDER BY j.numero ASC`

  interface JourneeMatchDatesRow {
    id: string
    numero: number
    saison_id: string
    date_journee: string | null
    first_match_date: string | null
    last_match_date: string | null
  }

  const results = await dataSource.query<JourneeMatchDatesRow[]>(query, params)

  return results.map((row) => ({
    id: row.id,
    numero: row.numero,
    saison_id: row.saison_id,
    date_journee: row.date_journee,
    first_match_date: row.first_match_date,
    last_match_date: row.last_match_date,
    start_window: null, // Sera calculé après
    end_window: null, // Sera calculé après
  }))
}

/**
 * Calcule les fenêtres de validité pour chaque journée
 * Note: Les fenêtres ne sont plus utilisées pour la logique principale,
 * mais conservées pour compatibilité et debug
 */
export function calculateJourneeWindows(journees: JourneeWithWindows[]): JourneeWithWindows[] {
  if (journees.length === 0) return []

  // Trier par numéro pour s'assurer de l'ordre
  const sorted = [...journees].sort((a, b) => a.numero - b.numero)

  return sorted.map((journee) => {
    // Si pas de match, pas de fenêtre
    if (!journee.first_match_date) {
      return {
        ...journee,
        start_window: null,
        end_window: null,
      }
    }

    const firstMatchDate = new Date(journee.first_match_date)
    const lastMatchDate = journee.last_match_date ? new Date(journee.last_match_date) : firstMatchDate

    // start_window = first_match_date (journée commence quand le premier match commence)
    const startWindow = new Date(firstMatchDate)
    startWindow.setHours(0, 0, 0, 0)

    // end_window = last_match_date (journée se termine quand le dernier match se termine)
    const endWindow = new Date(lastMatchDate)
    endWindow.setHours(23, 59, 59, 999)

    return {
      ...journee,
      start_window: startWindow.toISOString(),
      end_window: endWindow.toISOString(),
    }
  })
}

/**
 * Détermine la journée en cours selon la date du jour
 * Logique :
 * 1. Si date_journee == aujourd'hui → afficher cette journée
 * 2. Sinon → afficher la journée précédente (la plus récente avant aujourd'hui)
 * 
 * Retourne null si aucune journée n'est trouvée
 */
export function getCurrentJournee(
  journeesWithWindows: JourneeWithWindows[],
  referenceDate: Date = new Date()
): JourneeWithWindows | null {
  // Normaliser la date de référence (midnight)
  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0] // Format YYYY-MM-DD

  // Filtrer les journées qui ont une date ou au moins un match
  const validJournees = journeesWithWindows.filter(
    (j) => j.date_journee !== null || j.first_match_date !== null
  )

  if (validJournees.length === 0) {
    return null
  }

  // 1. Chercher une journée dont la date correspond exactement à aujourd'hui
  const todayJournee = validJournees.find((journee) => {
    if (journee.date_journee) {
      const journeeDate = new Date(journee.date_journee)
      journeeDate.setHours(0, 0, 0, 0)
      const journeeDateStr = journeeDate.toISOString().split('T')[0]
      return journeeDateStr === todayStr
    }
    // Fallback sur first_match_date si date_journee n'existe pas
    if (journee.first_match_date) {
      const matchDate = new Date(journee.first_match_date)
      matchDate.setHours(0, 0, 0, 0)
      const matchDateStr = matchDate.toISOString().split('T')[0]
      return matchDateStr === todayStr
    }
    return false
  })

  if (todayJournee) {
    return todayJournee
  }

  // 2. Sinon, trouver la journée précédente (la plus récente avant aujourd'hui)
  const pastJournees = validJournees.filter((journee) => {
    const dateToCheck = journee.date_journee || journee.first_match_date
    if (!dateToCheck) return false
    
    const journeeDate = new Date(dateToCheck)
    journeeDate.setHours(0, 0, 0, 0)
    return journeeDate < today
  })

  if (pastJournees.length === 0) {
    // Si aucune journée passée, prendre la prochaine journée future
    const futureJournees = validJournees.filter((journee) => {
      const dateToCheck = journee.date_journee || journee.first_match_date
      if (!dateToCheck) return false
      
      const journeeDate = new Date(dateToCheck)
      journeeDate.setHours(0, 0, 0, 0)
      return journeeDate > today
    })

    if (futureJournees.length === 0) {
      return validJournees[0] || null
    }

    // Trier par date croissante et prendre la première
    futureJournees.sort((a, b) => {
      const dateA = new Date(a.date_journee || a.first_match_date || 0)
      const dateB = new Date(b.date_journee || b.first_match_date || 0)
      return dateA.getTime() - dateB.getTime()
    })

    return futureJournees[0]
  }

  // Trier par date décroissante et prendre la première (la plus récente)
  pastJournees.sort((a, b) => {
    const dateA = new Date(a.date_journee || a.first_match_date || 0)
    const dateB = new Date(b.date_journee || b.first_match_date || 0)
    return dateB.getTime() - dateA.getTime()
  })

  return pastJournees[0]
}

/**
 * Fonction principale : récupère la journée en cours pour une ligue donnée
 */
export async function fetchCurrentJournee(
  leagueId?: string | null,
  referenceDate: Date = new Date()
): Promise<JourneeWithWindows | null> {
  const journees = await fetchJourneesWithMatchDates(leagueId)
  const journeesWithWindows = calculateJourneeWindows(journees)
  return getCurrentJournee(journeesWithWindows, referenceDate)
}

/**
 * Récupère les matchs de la journée en cours
 */
export async function fetchCurrentJourneeMatches(
  leagueId?: string | null,
  referenceDate: Date = new Date()
) {
  const dataSource = await getDataSource()
  const currentJournee = await fetchCurrentJournee(leagueId, referenceDate)

  if (!currentJournee) {
    return null
  }

  const matchRepo = dataSource.getRepository<Match>('matches')
  const matches = await matchRepo.find({
    where: { journee_id: currentJournee.id },
    relations: {
      journee: { saison: true },
      equipe_home: true,
      equipe_away: true,
      arbitre: true,
    },
    order: { date: 'ASC' },
  })

  const journeeRepo = dataSource.getRepository<Journee>('journees')
  const journee = await journeeRepo.findOne({
    where: { id: currentJournee.id },
    relations: { saison: true },
  })

  return {
    journee: journee ? toPlain(journee) : null,
    matches: matches.map((m) => toPlain(m)),
  }
}

