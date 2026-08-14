import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getActiveLeagueId } from '@/lib/leagueSelection'
import { getVoteById, updateVoteAdmin, deleteVoteAdmin } from '@/lib/adminVotes'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * GET /api/admin/votes/single/[id]
 * Récupère un vote par son ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const leagueId = await getActiveLeagueId()

    const vote = await getVoteById(id, leagueId)
    if (!vote) {
      return NextResponse.json(
        { error: 'Vote introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json(vote)
  } catch (error) {
    console.error('Error fetching vote:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/votes/single/[id]
 * Met à jour un vote (critères -> recalcule note_globale automatiquement)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const leagueId = await getActiveLeagueId()
    const body = await request.json()

    const vote = await updateVoteAdmin(id, body, leagueId)
    await logAdminAction({ request, action: 'update', entityType: 'vote', entityId: id })
    return NextResponse.json(vote)
  } catch (error) {
    console.error('Error updating vote:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

/**
 * DELETE /api/admin/votes/single/[id]
 * Supprime un vote
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const leagueId = await getActiveLeagueId()

    const result = await deleteVoteAdmin(id, leagueId)
    await logAdminAction({ request, action: 'delete', entityType: 'vote', entityId: id })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error deleting vote:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

