import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { updateMatchAdmin, deleteMatchAdmin } from '@/lib/adminMatches'
import { logAdminAction } from '@/lib/auditLog'
import { ScheduleConflictError } from '@/lib/scheduleConflicts'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const body = await request.json()
    // Permettre la modification de matchs sans restriction de ligue
    const { match, overriddenConflicts } = await updateMatchAdmin(id, body, null)
    await logAdminAction({ request, action: 'update', entityType: 'match', entityId: id })
    if (overriddenConflicts.length > 0) {
      await logAdminAction({
        request,
        action: 'derogation',
        entityType: 'match',
        entityId: id,
        summary: `Conflit(s) de programmation outrepassé(s) : ${overriddenConflicts.map((c) => c.message).join(' ; ')} | Motif : ${body.derogation_reason ?? ''}`,
      })
    }
    return NextResponse.json(match)
  } catch (error) {
    console.error('Error updating match:', error)
    if (error instanceof ScheduleConflictError) {
      return NextResponse.json({ error: error.message, conflicts: error.conflicts }, { status: 409 })
    }
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    // Permettre la suppression de matchs sans restriction de ligue
    await deleteMatchAdmin(id, null)
    await logAdminAction({ request, action: 'delete', entityType: 'match', entityId: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting match:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}


