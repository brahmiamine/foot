import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { createInvitation } from '@/lib/staffInvitations'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * POST /api/admin/club/[teamId]/invitations
 * Invite un nouveau compte staff (ADMIN/OBSERVATEUR) pour ce club — envoie
 * un email avec un lien à usage unique, ne crée le compte `User` qu'à
 * l'acceptation (voir /invite/[token]).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { teamId } = await params
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const role = body.role === 'OBSERVATEUR' ? 'OBSERVATEUR' : 'ADMIN'

    if (!name || !email) {
      return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 })
    }

    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    const appUrl = `${proto}://${host}`

    const invitation = await createInvitation({ teamId, name, email, role }, appUrl)
    await logAdminAction({
      request,
      action: 'create',
      entityType: 'staff_invitation',
      entityId: invitation.id,
      summary: email,
    })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error creating staff invitation:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}
