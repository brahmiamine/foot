/**
 * Filtrage automatique des votes suspects
 * Exclut les votes détectés comme suspects des calculs de moyennes et classements
 */

import { In } from 'typeorm'
import { getDataSource } from './db'
import { Vote, Match } from './entities'
import { detectVoteAnomalies } from './voteAnomalyDetection'
import { toPlainArray } from './serialization'

interface VoteRow {
  id: string
  note_globale: number | string
  created_at?: Date | string
  device_fingerprint?: string | null
  ip_address?: string | null
}

/**
 * Calcule les IDs de votes suspects pour un match à partir de votes déjà chargés en mémoire.
 * Fonction pure (aucun accès base de données) afin de pouvoir être appelée en boucle sans
 * provoquer de requêtes N+1 (voir filterSuspiciousVotesBatch).
 *
 * @param votes - Votes du match (déjà chargés)
 * @param matchDate - Date du match
 * @returns Set d'IDs de votes suspects
 */
function computeSuspiciousVoteIds(votes: VoteRow[], matchDate?: Date | string | null): Set<string> {
  // Si moins de 5 votes, on ne peut pas détecter d'anomalies statistiques
  if (votes.length < 5) {
    return new Set<string>()
  }

  const votesForAnalysis = votes.map((v) => ({
    note_globale: typeof v.note_globale === 'string'
      ? parseFloat(v.note_globale)
      : Number(v.note_globale),
    created_at: v.created_at || new Date(),
    device_fingerprint: v.device_fingerprint || null,
    ip_address: v.ip_address || null,
  }))

  const anomaly = detectVoteAnomalies(votesForAnalysis, matchDate)

  // Si le match n'est pas suspect, aucun vote n'est exclu
  if (!anomaly.isSuspicious) {
    return new Set<string>()
  }

  // Si le match est suspect, on identifie les votes suspects selon les critères détectés
  const suspiciousVoteIds = new Set<string>()

  // 1. Si votes extrêmes groupés (>80% à 5/5 ou 1/5), exclure tous les votes extrêmes
  if (anomaly.details.extremeVotesPercentage && anomaly.details.extremeVotesPercentage > 80) {
    votes.forEach((vote) => {
      const note = typeof vote.note_globale === 'string'
        ? parseFloat(vote.note_globale)
        : Number(vote.note_globale)
      if (note >= 4.8 || note <= 1.2) {
        suspiciousVoteIds.add(vote.id)
      }
    })
  }

  // 2. Si votes groupés dans le temps, exclure les votes dans la fenêtre suspecte
  if (anomaly.details.timeGroupingDetected) {
    const sortedVotes = [...votes].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateA - dateB
    })

    for (let i = 0; i < sortedVotes.length; i++) {
      const created_at = sortedVotes[i].created_at
      const windowStart = created_at
        ? (typeof created_at === 'string' ? new Date(created_at) : created_at instanceof Date ? created_at : new Date(created_at))
        : new Date()
      const windowEnd = new Date(windowStart.getTime() + 10 * 60 * 1000) // 10 minutes

      const votesInWindow = sortedVotes.filter((v) => {
        const voteTime = v.created_at ? new Date(v.created_at) : new Date()
        return voteTime >= windowStart && voteTime <= windowEnd
      })

      if (votesInWindow.length / votes.length > 0.5 && votesInWindow.length >= 5) {
        // Marquer tous les votes dans cette fenêtre comme suspects
        votesInWindow.forEach((v) => suspiciousVoteIds.add(v.id))
        break
      }
    }
  }

  // 3. Si variance trop faible, exclure tous les votes (tous suspects)
  if (anomaly.details.variance !== undefined && anomaly.details.variance < 0.3 && votes.length >= 10) {
    votes.forEach((vote) => suspiciousVoteIds.add(vote.id))
  }

  return suspiciousVoteIds
}

/**
 * Identifie les votes suspects d'un match en utilisant la détection d'anomalies
 *
 * @param matchId - ID du match
 * @returns Set d'IDs de votes suspects, ou null si pas assez de votes pour analyser
 */
export async function getSuspiciousVoteIds(matchId: string): Promise<Set<string> | null> {
  const dataSource = await getDataSource()
  const voteRepo = dataSource.getRepository<Vote>('votes')
  const matchRepo = dataSource.getRepository<Match>('matches')

  // Récupérer le match pour avoir la date
  const match = await matchRepo.findOne({
    where: { id: matchId },
    select: ['id', 'date'],
  })

  if (!match) {
    return null
  }

  // Récupérer tous les votes du match
  const votes = await voteRepo.find({
    where: { match_id: matchId },
    select: ['id', 'note_globale', 'created_at', 'device_fingerprint', 'ip_address'],
    order: { created_at: 'ASC' },
  })

  return computeSuspiciousVoteIds(toPlainArray(votes) as VoteRow[], match.date)
}

/**
 * Filtre les votes suspects d'un tableau de votes
 *
 * @param votes - Tableau de votes à filtrer
 * @param matchId - ID du match (optionnel, pour détection d'anomalies)
 * @returns Tableau de votes filtrés (sans les suspects)
 */
export async function filterSuspiciousVotes<T extends { id: string; match_id?: string }>(
  votes: T[],
  matchId?: string
): Promise<T[]> {
  if (votes.length === 0) {
    return votes
  }

  // Si pas de matchId, on ne peut pas filtrer (pas d'analyse possible)
  if (!matchId && votes.length > 0 && votes[0].match_id) {
    matchId = votes[0].match_id
  }

  if (!matchId) {
    // Si on ne peut pas identifier le match, on ne filtre pas
    return votes
  }

  const suspiciousIds = await getSuspiciousVoteIds(matchId)

  if (!suspiciousIds || suspiciousIds.size === 0) {
    return votes
  }

  return votes.filter((vote) => !suspiciousIds.has(vote.id))
}

/**
 * Filtre les votes suspects pour plusieurs matches
 *
 * Les votes passés en paramètre sont déjà chargés en mémoire : on ne fait donc qu'une
 * seule requête batch pour récupérer les dates des matchs concernés, puis la détection
 * d'anomalies est calculée en mémoire pour chaque match (au lieu de re-requêter la base
 * pour chaque match individuellement, ce qui provoquait un problème N+1).
 *
 * @param votes - Tableau de votes à filtrer
 * @returns Tableau de votes filtrés (sans les suspects)
 */
export async function filterSuspiciousVotesBatch<T extends VoteRow & { match_id?: string }>(
  votes: T[]
): Promise<T[]> {
  if (votes.length === 0) {
    return votes
  }

  // Grouper les votes par match_id
  const votesByMatch = new Map<string, T[]>()
  votes.forEach((vote) => {
    if (vote.match_id) {
      const existing = votesByMatch.get(vote.match_id) || []
      existing.push(vote)
      votesByMatch.set(vote.match_id, existing)
    }
  })

  if (votesByMatch.size === 0) {
    return votes
  }

  // Une seule requête batch pour récupérer les dates de tous les matchs concernés
  const dataSource = await getDataSource()
  const matchRepo = dataSource.getRepository<Match>('matches')
  const matchIds = Array.from(votesByMatch.keys())
  const matches = await matchRepo.find({
    where: { id: In(matchIds) },
    select: ['id', 'date'],
  })
  const matchDates = new Map(matches.map((m) => [m.id, m.date]))

  const suspiciousIdsSet = new Set<string>()

  for (const [matchId, matchVotes] of votesByMatch.entries()) {
    const suspiciousIds = computeSuspiciousVoteIds(matchVotes, matchDates.get(matchId))
    suspiciousIds.forEach((id) => suspiciousIdsSet.add(id))
  }

  if (suspiciousIdsSet.size === 0) {
    return votes
  }

  return votes.filter((vote) => !suspiciousIdsSet.has(vote.id))
}
