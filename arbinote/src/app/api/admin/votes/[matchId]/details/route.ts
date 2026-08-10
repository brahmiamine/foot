import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { Vote, Match } from '@/lib/entities'
import { detectVoteAnomalies, calculateVoteCredibility } from '@/lib/voteAnomalyDetection'
import { toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

/**
 * GET /api/admin/votes/[matchId]/details
 * Récupère tous les votes d'un match avec leurs détails complets pour la modération
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

    // Récupérer le match
    const match = await matchRepo.findOne({
      where: { id: matchId },
      select: ['id', 'date', 'arbitre_id'],
      relations: ['arbitre', 'equipe_home', 'equipe_away', 'journee'],
    })

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Récupérer tous les votes avec tous les détails
    const votes = await voteRepo.find({
      where: { match_id: matchId },
      select: [
        'id',
        'note_globale',
        'criteres',
        'created_at',
        'device_fingerprint',
        'ip_address',
        'moderation_status',
        'moderated_at',
        'moderated_by',
        'moderation_notes',
      ],
      order: { created_at: 'ASC' },
    })

    // Préparer les données pour l'analyse
    const votesForAnalysis = toPlainArray(votes).map((v: any) => ({
      note_globale: typeof v.note_globale === 'string'
        ? parseFloat(v.note_globale)
        : Number(v.note_globale),
      created_at: v.created_at || new Date(),
      device_fingerprint: v.device_fingerprint || null,
      ip_address: v.ip_address || null,
    }))

    // Analyser les anomalies
    const anomaly = detectVoteAnomalies(votesForAnalysis, match.date)
    const credibility = calculateVoteCredibility(votesForAnalysis, match.date)

    // Compter les votes par statut de modération
    const moderationStats = {
      pending: votes.filter(v => !v.moderation_status || v.moderation_status === 'pending').length,
      validated: votes.filter(v => v.moderation_status === 'validated').length,
      excluded: votes.filter(v => v.moderation_status === 'excluded').length,
    }

    return NextResponse.json({
      match: {
        id: match.id,
        date: match.date,
        arbitre: match.arbitre ? {
          id: match.arbitre.id,
          nom: match.arbitre.nom,
        } : null,
        equipe_home: match.equipe_home ? {
          id: match.equipe_home.id,
          nom: match.equipe_home.nom,
        } : null,
        equipe_away: match.equipe_away ? {
          id: match.equipe_away.id,
          nom: match.equipe_away.nom,
        } : null,
      },
      votes: toPlainArray(votes).map((v: any) => ({
        ...v,
        note_globale: typeof v.note_globale === 'string'
          ? parseFloat(v.note_globale)
          : Number(v.note_globale),
      })),
      anomaly: {
        isSuspicious: anomaly.isSuspicious,
        confidence: anomaly.confidence,
        reasons: anomaly.reasons,
        details: anomaly.details,
      },
      credibility: Math.round(credibility * 100) / 100,
      moderationStats,
      totalVotes: votes.length,
    })
  } catch (error) {
    console.error('Unexpected error in /api/admin/votes/[matchId]/details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

