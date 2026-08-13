import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { safeErrorMessage } from '@/lib/apiError'
import { retryMatchSaga } from '@/lib/matchSaga'
import { logAdminAction } from '@/lib/auditLog'
import { toPlain } from '@/lib/serialization'

export const runtime = 'nodejs'

/**
 * POST /api/admin/match-sagas/[id]/retry — TASK-P0-003 (todo.md).
 * Intervention manuelle : rejoue les seules étapes en échec d'un dossier
 * MANUAL_REVIEW (voir retryMatchSaga, qui rejette tout autre statut).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const sagaCase = await retryMatchSaga(id)
    await logAdminAction({
      request,
      action: 'retry',
      entityType: 'match_saga',
      entityId: id,
      summary: `Rejeu de la saga : nouveau statut ${sagaCase.status}`,
    })
    return NextResponse.json(toPlain(sagaCase))
  } catch (error) {
    console.error('Error retrying match saga:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}
