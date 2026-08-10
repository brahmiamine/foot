import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { updateCritere, deleteCritere } from '@/lib/adminCriteres'
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
    const critere = await updateCritere(id, body)
    await logAdminAction({ request, action: 'update', entityType: 'critere', entityId: id })
    return NextResponse.json(critere)
  } catch (error) {
    console.error('Error updating critere:', error)
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
    await deleteCritere(id)
    await logAdminAction({ request, action: 'delete', entityType: 'critere', entityId: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting critere:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}


