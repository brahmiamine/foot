import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { Vote, Match } from '@/lib/entities'
import { detectVoteAnomalies, calculateVoteCredibility } from '@/lib/voteAnomalyDetection'
import { toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

interface MatchAnomaly {
  match_id: string
  match_date: Date | null
  total_votes: number
  anomaly: {
    isSuspicious: boolean
    confidence: number
    reasons: string[]
    details: any
  }
  credibility: number
}

/**
 * GET /api/admin/votes/anomalies
 * Liste toutes les anomalies détectées pour tous les matches avec votes
 * Protégé par authentification admin
 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const onlySuspicious = searchParams.get('onlySuspicious') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const dataSource = await getDataSource()
    const voteRepo = dataSource.getRepository<Vote>('votes')
    const matchRepo = dataSource.getRepository<Match>('matches')

    // Récupérer tous les matches qui ont des votes
    const matchesWithVotes = await voteRepo
      .createQueryBuilder('vote')
      .select('vote.match_id', 'match_id')
      .addSelect('COUNT(*)', 'vote_count')
      .groupBy('vote.match_id')
      .having('COUNT(*) >= 5') // Seulement les matches avec au moins 5 votes
      .orderBy('vote_count', 'DESC')
      .limit(limit)
      .getRawMany()

    const anomalies: MatchAnomaly[] = []

    for (const matchData of matchesWithVotes) {
      const matchId = matchData.match_id

      // Récupérer le match pour avoir la date
      const match = await matchRepo.findOne({
        where: { id: matchId },
        select: ['id', 'date'],
      })

      if (!match) continue

      // Récupérer tous les votes du match
      const votes = await voteRepo.find({
        where: { match_id: matchId },
        select: ['note_globale', 'created_at', 'device_fingerprint', 'ip_address'],
        order: { created_at: 'ASC' },
      })

      if (votes.length < 5) continue

      // Préparer les données pour l'analyse
      const votesForAnalysis = toPlainArray(votes).map((v: any) => ({
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

      // Filtrer si on veut seulement les suspects
      if (onlySuspicious && !anomaly.isSuspicious) {
        continue
      }

      anomalies.push({
        match_id: matchId,
        match_date: match.date || null,
        total_votes: votes.length,
        anomaly,
        credibility: Math.round(credibility * 100) / 100,
      })
    }

    // Trier par niveau de suspicion (plus suspect en premier)
    anomalies.sort((a, b) => b.anomaly.confidence - a.anomaly.confidence)

    return NextResponse.json({
      total: anomalies.length,
      anomalies,
    })
  } catch (error) {
    console.error('Unexpected error in /api/admin/votes/anomalies:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

