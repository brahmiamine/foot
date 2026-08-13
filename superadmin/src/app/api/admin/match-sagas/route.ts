import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { safeErrorMessage } from '@/lib/apiError'
import { listMatchSagas } from '@/lib/matchSaga'
import { toPlainArray } from '@/lib/serialization'
import type { MatchSagaStatus } from '@/lib/entities'

export const runtime = 'nodejs'

const VALID_STATUSES: MatchSagaStatus[] = ['IN_PROGRESS', 'COMPLETED', 'MANUAL_REVIEW']

/**
 * GET /api/admin/match-sagas — TASK-P0-003 (todo.md). Journal des sagas
 * d'annulation/report de match. `?status=MANUAL_REVIEW` pour l'usage ops le
 * plus courant : retrouver les dossiers qui attendent une intervention.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const status =
      statusParam && VALID_STATUSES.includes(statusParam as MatchSagaStatus)
        ? (statusParam as MatchSagaStatus)
        : undefined

    const sagas = await listMatchSagas(status)
    return NextResponse.json({ sagas: toPlainArray(sagas) })
  } catch (error) {
    console.error('Error listing match sagas:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}
