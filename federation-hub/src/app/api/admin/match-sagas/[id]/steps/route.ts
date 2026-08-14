import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { safeErrorMessage } from '@/lib/apiError'
import { getMatchSagaSteps } from '@/lib/matchSaga'
import { toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

/**
 * GET /api/admin/match-sagas/[id]/steps — TASK-P0-003 (todo.md). Historique
 * complet des tentatives d'étapes (append-only, voir MatchSagaStep) d'un
 * dossier de saga, dans l'ordre chronologique.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const steps = await getMatchSagaSteps(id)
    return NextResponse.json({ steps: toPlainArray(steps) })
  } catch (error) {
    console.error('Error fetching match saga steps:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}
