import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { updateClubUser, deleteClubUser } from '@/lib/clubAccounts'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * PUT /api/admin/club/users/[id]
 * Met à jour un compte (activation, rôle, réinitialisation du mot de passe).
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const body = await request.json()
    const user = await updateClubUser(id, body)
    await logAdminAction({ request, action: 'update', entityType: 'club_user', entityId: id, summary: user.email })
    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating club user:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}

/**
 * DELETE /api/admin/club/users/[id]
 * Supprime un compte de connexion.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    await deleteClubUser(id)
    await logAdminAction({ request, action: 'delete', entityType: 'club_user', entityId: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting club user:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}
