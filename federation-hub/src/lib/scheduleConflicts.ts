import { DataSource } from 'typeorm'
import { Journee, Match, Team } from './entities'

export interface ScheduleConflict {
  type: 'team' | 'referee' | 'stadium'
  message: string
  conflictingMatchId: string
}

export class ScheduleConflictError extends Error {
  conflicts: ScheduleConflict[]

  constructor(conflicts: ScheduleConflict[]) {
    super(`Conflit(s) de programmation détecté(s) : ${conflicts.map((c) => c.message).join(' ; ')}`)
    this.name = 'ScheduleConflictError'
    this.conflicts = conflicts
  }
}

/** `MATCH_MIN_REST_MINUTES` : écart minimal configurable entre deux engagements d'une même équipe/arbitre/stade. */
export function getMinRestMinutes(): number {
  const raw = Number(process.env.MATCH_MIN_REST_MINUTES)
  return Number.isFinite(raw) && raw >= 0 ? raw : 120
}

export interface ScheduleConflictInput {
  date: Date | null
  equipeHomeId: string
  equipeAwayId: string
  arbitreId?: string | null
  /** Exclu de la recherche de conflits : le match en cours de modification. */
  excludeMatchId?: string
}

/**
 * Détecte les chevauchements de programmation (§TASK-P0-008) : une même
 * équipe, un même arbitre ou un même stade (approximé par le stade de
 * l'équipe qui reçoit — `matches` n'a pas de colonne de lieu propre, voir
 * audit du todo) ne peuvent pas avoir deux engagements à moins de
 * `MATCH_MIN_REST_MINUTES` d'écart. Le modèle de données ne portant pas de
 * durée de match, le chevauchement est approximé par la proximité des heures
 * de coup d'envoi (fenêtre symétrique autour de chaque match candidat), pas
 * par une intersection d'intervalles [début, fin].
 *
 * Les matchs sans horodatage (`date` non défini) et les matchs `CANCELLED`
 * sont ignorés : rien à valider dans le premier cas (aucune notion de
 * "moment" pour détecter un chevauchement), et un match annulé ne mobilise
 * plus l'équipe/l'arbitre/le stade.
 */
export async function findScheduleConflicts(
  dataSource: DataSource,
  input: ScheduleConflictInput,
): Promise<ScheduleConflict[]> {
  if (!input.date) return []

  const minRestMs = getMinRestMinutes() * 60_000
  const windowStart = new Date(input.date.getTime() - minRestMs)
  const windowEnd = new Date(input.date.getTime() + minRestMs)

  const matchRepo = dataSource.getRepository(Match)
  const qb = matchRepo
    .createQueryBuilder('m')
    .leftJoinAndSelect('m.equipe_home', 'equipe_home')
    .leftJoinAndSelect('m.equipe_away', 'equipe_away')
    .where('m.date IS NOT NULL')
    .andWhere('m.date BETWEEN :windowStart AND :windowEnd', { windowStart, windowEnd })
    .andWhere('m.status != :cancelled', { cancelled: 'CANCELLED' })

  if (input.excludeMatchId) {
    qb.andWhere('m.id != :excludeMatchId', { excludeMatchId: input.excludeMatchId })
  }

  const candidates = await qb.getMany()
  if (candidates.length === 0) return []

  const conflicts: ScheduleConflict[] = []

  let homeStadium: string | null = null
  if (input.equipeHomeId) {
    const teamRepo = dataSource.getRepository(Team)
    const home = await teamRepo.findOne({ where: { id: input.equipeHomeId } })
    homeStadium = normalizeStadium(home?.stadium)
  }

  for (const candidate of candidates) {
    const candidateTeamIds = [candidate.equipe_home_id, candidate.equipe_away_id]
    const teamConflict = [input.equipeHomeId, input.equipeAwayId].find((teamId) =>
      candidateTeamIds.includes(teamId),
    )
    if (teamConflict) {
      conflicts.push({
        type: 'team',
        conflictingMatchId: candidate.id,
        message: `L'équipe ${teamNameFor(candidate, teamConflict)} a déjà un match programmé le ${formatDate(candidate.date)} (moins de ${getMinRestMinutes()} min d'écart).`,
      })
    }

    if (input.arbitreId && candidate.arbitre_id === input.arbitreId) {
      conflicts.push({
        type: 'referee',
        conflictingMatchId: candidate.id,
        message: `L'arbitre est déjà désigné sur un autre match le ${formatDate(candidate.date)} (moins de ${getMinRestMinutes()} min d'écart).`,
      })
    }

    if (homeStadium && normalizeStadium(candidate.equipe_home?.stadium) === homeStadium) {
      conflicts.push({
        type: 'stadium',
        conflictingMatchId: candidate.id,
        message: `Le stade "${homeStadium}" est déjà utilisé pour un autre match le ${formatDate(candidate.date)} (moins de ${getMinRestMinutes()} min d'écart).`,
      })
    }
  }

  return conflicts
}

function normalizeStadium(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed.toLowerCase() : null
}

function teamNameFor(match: Match, teamId: string): string {
  if (match.equipe_home_id === teamId) return match.equipe_home?.nom ?? teamId
  if (match.equipe_away_id === teamId) return match.equipe_away?.nom ?? teamId
  return teamId
}

function formatDate(date?: Date | null): string {
  if (!date) return 'date inconnue'
  return new Date(date).toISOString()
}

/**
 * Cohérence journée/saison/date (§TASK-P0-008) : la date du match, si
 * fournie, doit tomber dans les bornes de la saison de sa journée.
 */
export async function assertSeasonDateCoherence(
  dataSource: DataSource,
  journeeId: string,
  date: Date | null,
): Promise<void> {
  if (!date) return

  const journeeRepo = dataSource.getRepository(Journee)
  const journee = await journeeRepo.findOne({
    where: { id: journeeId },
    relations: { saison: true },
  })
  if (!journee) return // Résolu par ailleurs (journée introuvable) : rien à valider ici.

  const saison = journee.saison
  if (!saison) return

  if (saison.date_debut && date < new Date(saison.date_debut)) {
    throw new Error(
      `La date du match (${date.toISOString()}) précède le début de la saison (${saison.date_debut})`,
    )
  }
  if (saison.date_fin) {
    // Fin de saison incluse jusqu'à 23:59:59 du jour indiqué.
    const seasonEnd = new Date(saison.date_fin)
    seasonEnd.setHours(23, 59, 59, 999)
    if (date > seasonEnd) {
      throw new Error(`La date du match (${date.toISOString()}) dépasse la fin de la saison (${saison.date_fin})`)
    }
  }
}
