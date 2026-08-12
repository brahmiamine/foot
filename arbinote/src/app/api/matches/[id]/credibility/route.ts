import { NextRequest, NextResponse } from 'next/server'
import { getDataSource } from '@/lib/db'
import { Vote, Match } from '@/lib/entities'
import { calculateVoteCredibility } from '@/lib/voteAnomalyDetection'
import { toPlainArray } from '@/lib/serialization'
import { enforcePublicRateLimit } from '@/lib/publicRateLimit'

/**
 * GET /api/matches/[id]/credibility
 * Retourne le score de crédibilité (0-100) pour un match donné
 * Basé sur la détection d'anomalies statistiques
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = enforcePublicRateLimit(request, 'match-credibility')
  if (limited) return limited

  try {
    const { id: matchId } = await params

    const dataSource = await getDataSource()
    const voteRepo = dataSource.getRepository<Vote>('votes')
    const matchRepo = dataSource.getRepository<Match>('matches')

    // Récupérer le match pour avoir la date
    const match = await matchRepo.findOne({
      where: { id: matchId },
      select: ['id', 'date'],
    })

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Récupérer tous les votes du match
    const votes = await voteRepo.find({
      where: { match_id: matchId },
      select: ['note_globale', 'created_at', 'device_fingerprint', 'ip_address'],
      order: { created_at: 'ASC' },
    })

    if (votes.length === 0) {
      // Pas de votes = crédibilité par défaut (neutre)
      return NextResponse.json({
        match_id: matchId,
        credibility: 100,
        total_votes: 0,
        message: 'No votes yet',
      })
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

    return NextResponse.json({
      match_id: matchId,
      credibility: Math.round(credibility * 100) / 100,
      total_votes: votes.length,
    })
  } catch (error) {
    console.error('Unexpected error in /api/matches/[id]/credibility:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

