import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { countArbitres } from '@/lib/adminArbitres'
import { getDataSource } from '@/lib/db'
import { Match, Vote } from '@/lib/entities'

export const runtime = 'nodejs'

/**
 * GET /api/admin/stats
 * Retourne les statistiques générales du dashboard admin
 * Protégé par authentification admin
 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminAuth(request)
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

    const stats = {
      arbitres: arbitresCount,
      matches: matchesCount,
      votes: votesCount,
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

