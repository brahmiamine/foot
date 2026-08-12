import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { Vote, Match } from '@/lib/entities'
import { detectVoteAnomalies, calculateVoteCredibility } from '@/lib/voteAnomalyDetection'
import { toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

/**
 * GET /api/admin/votes/[matchId]/anomalies
 * Analyse les votes d'un match et retourne les anomalies détectées
 * Protégé par authentification admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { matchId } = await params

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
      return NextResponse.json({
        match_id: matchId,
        total_votes: 0,
        anomaly: {
          isSuspicious: false,
          confidence: 0,
          reasons: ['Aucun vote pour ce match'],
          details: {},
        },
        credibility: 100,
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

    // Détecter les anomalies
    const anomaly = detectVoteAnomalies(votesForAnalysis, match.date)
    const credibility = calculateVoteCredibility(votesForAnalysis, match.date)

    return NextResponse.json({
      match_id: matchId,
      total_votes: votes.length,
      anomaly,
      credibility: Math.round(credibility * 100) / 100,
      match_date: match.date,
    })
  } catch (error) {
    console.error('Unexpected error in /api/admin/votes/[matchId]/anomalies:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

