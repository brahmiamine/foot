import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { reopenMatchAdmin } from '@/lib/adminMatches'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * Rouvre un match FINISHED (matches.status -> IN_PROGRESS, ms_sheets.status
 * -> IN_PROGRESS) avec motif obligatoire — voir reopenMatchAdmin dans
 * src/lib/adminMatches.ts pour les restrictions et la justification de
 * l'écriture directe dans ms_sheets depuis federation-hub.
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
      return NextResponse.json({ error: 'Un motif de réouverture est requis' }, { status: 400 })
    }

    const result = await reopenMatchAdmin(id, reason)
    await logAdminAction({
      request,
      action: 'reopen',
      entityType: 'match',
      entityId: id,
      summary: `Réouverture : ${reason}`,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error reopening match:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}
