import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getActiveLeagueId } from '@/lib/leagueSelection'
import {
  listVotesForAdmin,
  deleteMultipleVotesAdmin,
  getMatchesForFilter,
  getArbitresForFilter,
  getJourneesForFilter,
  VoteFilters,
} from '@/lib/adminVotes'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * GET /api/admin/votes
 * Liste tous les votes avec filtres et pagination
 */
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const leagueId = await getActiveLeagueId()
    const { searchParams } = new URL(request.url)

    const voteStatusParam = searchParams.get('voteStatus')
    let voteStatus: VoteFilters['voteStatus'] = 'all'
    if (voteStatusParam === 'voted' || voteStatusParam === 'not_voted') {
      voteStatus = voteStatusParam
    }

    const filters: VoteFilters = {
      matchId: searchParams.get('matchId') || undefined,
      arbitreId: searchParams.get('arbitreId') || undefined,
      journeeId: searchParams.get('journeeId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      voteStatus,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    }

    // Si on demande les filtres disponibles
    if (searchParams.get('getFilters') === 'true') {
      const [matches, arbitres, journees] = await Promise.all([
        getMatchesForFilter(leagueId),
        getArbitresForFilter(leagueId),
        getJourneesForFilter(leagueId),
      ])

      return NextResponse.json({
        matches,
        arbitres,
        journees,
      })
    }

    const result = await listVotesForAdmin(filters, leagueId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching votes for admin:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/votes
 * Supprime plusieurs votes (bulk delete)
 */
export async function DELETE(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const leagueId = await getActiveLeagueId()
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'IDs des votes requis' },
        { status: 400 }
      )
    }

    const result = await deleteMultipleVotesAdmin(ids, leagueId)
    await logAdminAction({ request, action: 'delete', entityType: 'vote', summary: `${ids.length} vote(s) supprimé(s)` })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error deleting votes:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

