import { NextRequest, NextResponse } from 'next/server'
import { In } from 'typeorm'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { countArbitres } from '@/lib/adminArbitres'
import { getDataSource } from '@/lib/db'
import { Match, Vote, VoteAlert } from '@/lib/entities'

export const runtime = 'nodejs'

/**
 * GET /api/admin/stats
 * Retourne les statistiques générales du dashboard admin
 * Protégé par authentification admin
 */
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const dataSource = await getDataSource()
    
    // Compter les arbitres
    const arbitresCount = await countArbitres()
    
    // Compter les matchs
    const matchRepo = dataSource.getRepository<Match>('matches')
    const matchesCount = await matchRepo.count()
    
    // Compter les votes
    const voteRepo = dataSource.getRepository<Vote>('votes')
    const votesCount = await voteRepo.count()

    // Alertes de fraude sur les votes (gérées dans arbinote, jamais visibles
    // ici avant ce fix) — même définition d'"non résolue" que arbinote
    // (lib/voteAlerting.ts::getUnresolvedAlertsCount).
    const voteAlertRepo = dataSource.getRepository<VoteAlert>('vote_alerts')
    const unresolvedVoteAlerts = await voteAlertRepo.count({ where: { status: In(['new', 'reviewed']) } })

    const stats = {
      arbitres: arbitresCount,
      matches: matchesCount,
      votes: votesCount,
      unresolvedVoteAlerts,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Unexpected error in /api/admin/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

