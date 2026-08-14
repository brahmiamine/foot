import { NextRequest, NextResponse } from 'next/server'
import { getOfficialEvalSession } from '@/lib/adminAuth'
import { getRefereeOfficialAnalytics } from '@/lib/refereeOfficialAnalytics'
import { assessmentScopeForSession } from '@/lib/refereeAssessmentAuthorization'

export const runtime = 'nodejs'

/** GET /api/admin/arbitrage/evaluations/arbitres/:arbitreId/stats — statistiques de performance, migration.md §12 ("aide aux promotions/désignations/formations"). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ arbitreId: string }> }) {
  const session = await getOfficialEvalSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { arbitreId } = await params
  const stats = await getRefereeOfficialAnalytics(arbitreId, {
    ...assessmentScopeForSession(session),
    observerUserId: session.role === 'REFEREE_OBSERVER' ? session.id : null,
  })
  return NextResponse.json(stats)
}
