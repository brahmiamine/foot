/**
 * Fonction utilitaire pour calculer la crédibilité d'un match côté serveur
 */

import { getDataSource } from './db'
import { Vote, Match } from './entities'
import { calculateVoteCredibility } from './voteAnomalyDetection'
import { toPlainArray } from './serialization'

/**
 * Calcule la crédibilité d'un match (0-100)
 * @param matchId - ID du match
 * @returns Score de crédibilité (0-100) ou null si erreur
 */
export async function getMatchCredibility(matchId: string): Promise<number | null> {
  try {
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
      select: ['note_globale', 'created_at', 'device_fingerprint', 'ip_address'],
      order: { created_at: 'ASC' },
    })

    if (votes.length === 0) {
      // Pas de votes = crédibilité par défaut (100%)
      return 100
    }

    // Préparer les données pour l'analyse
    const votesForAnalysis = toPlainArray(votes).map((v) => ({
      note_globale: typeof v.note_globale === 'string'
        ? parseFloat(v.note_globale)
        : Number(v.note_globale),
      created_at: v.created_at || new Date(),
      device_fingerprint: v.device_fingerprint || null,
      ip_address: v.ip_address || null,
    }))

    // Calculer la crédibilité
    const credibility = calculateVoteCredibility(votesForAnalysis, match.date)

    return Math.round(credibility * 100) / 100
  } catch (error) {
    console.error('Error calculating match credibility:', error)
    return null
  }
}

