import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { cancelMatchAdmin } from '@/lib/adminMatches'
import { getAdminUsername, logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * Annule un match (matches.status -> CANCELLED). Action distincte de
 * PATCH /api/admin/matches/[id] (mise à jour libre des champs) : irréversible
 * depuis cette route (pas de réactivation), restreinte aux matchs UPCOMING —
 * voir cancelMatchAdmin dans src/lib/adminMatches.ts.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (!reason) {
      return NextResponse.json({ error: 'Un motif d\'annulation est requis' }, { status: 400 })
    }

    const result = await cancelMatchAdmin(id, reason, getAdminUsername(request))
    await logAdminAction({
      request,
      action: 'cancel',
      entityType: 'match',
      entityId: id,
      summary: `Annulation : ${reason}`,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error cancelling match:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}
