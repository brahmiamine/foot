import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { resolveManualRefund } from '@/lib/refundOperationsClient'

export const runtime = 'nodejs'

function isPlatformRole(role: string): boolean {
  return role === 'SUPERADMIN' || role === 'PLATFORM_SUPERADMIN'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isPlatformRole(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, action } = await params
  if (action !== 'confirm' && action !== 'reject') {
    return NextResponse.json({ error: 'Action inconnue.' }, { status: 404 })
  }

  try {
    const body = (await request.json()) as { note?: string }
    const note = body.note?.trim()
    if (!note || note.length > 2000) {
      return NextResponse.json({ error: 'Un motif valide est obligatoire.' }, { status: 400 })
    }
    await resolveManualRefund(id, action, note, session.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error resolving manual refund:', error)
    return NextResponse.json(
      { error: 'Impossible de traiter le remboursement manuel.' },
      { status: 502 },
    )
  }
}
