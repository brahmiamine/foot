import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { updateSaisonAdmin, deleteSaisonAdmin } from '@/lib/adminSaisons'
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
    // Permettre la modification de saisons de n'importe quelle ligue
    const saison = await updateSaisonAdmin(id, body, null)
    await logAdminAction({ request, action: 'update', entityType: 'saison', entityId: id, summary: saison.nom })
    return NextResponse.json(saison)
  } catch (error) {
    console.error('Error updating saison:', error)
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
    // Permettre la suppression de saisons de n'importe quelle ligue
    await deleteSaisonAdmin(id, null)
    await logAdminAction({ request, action: 'delete', entityType: 'saison', entityId: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting saison:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

