import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { updateJourneeAdmin, deleteJourneeAdmin } from '@/lib/adminJournees'
import { logAdminAction } from '@/lib/auditLog'

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
    // Permettre la modification de journées de n'importe quelle saison
    const journee = await updateJourneeAdmin(id, body, null)
    await logAdminAction({ request, action: 'update', entityType: 'journee', entityId: id })
    return NextResponse.json(journee)
  } catch (error) {
    console.error('Error updating journee:', error)
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
    // Permettre la suppression de journées de n'importe quelle saison
    await deleteJourneeAdmin(id, null)
    await logAdminAction({ request, action: 'delete', entityType: 'journee', entityId: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting journee:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

