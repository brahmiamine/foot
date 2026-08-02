import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { updateMatchAdmin, deleteMatchAdmin } from '@/lib/adminMatches'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const body = await request.json()
    // Permettre la modification de matchs sans restriction de ligue
    const match = await updateMatchAdmin(id, body, null)
    await logAdminAction({ request, action: 'update', entityType: 'match', entityId: id })
    return NextResponse.json(match)
  } catch (error) {
    console.error('Error updating match:', error)
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
  const unauthorized = ensureAdminAuth(request)
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


