import { NextRequest, NextResponse } from 'next/server'
import { getOfficialEvalSession } from '@/lib/adminAuth'
import { listEvaluationsForArbitre } from '@/lib/refereeOfficialEvaluations'
import { assessmentScopeForSession } from '@/lib/refereeAssessmentAuthorization'

export const runtime = 'nodejs'

/** GET /api/admin/arbitrage/evaluations/arbitres/:arbitreId/evaluations — historique par arbitre (migration.md §12). Lecture ouverte à tout rôle d'évaluation officielle. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ arbitreId: string }> }) {
  const session = await getOfficialEvalSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { arbitreId } = await params
  const evaluations = (await listEvaluationsForArbitre(arbitreId, assessmentScopeForSession(session)))
    .filter((evaluation) => session.role !== 'REFEREE_OBSERVER' || evaluation.observer_user_id === session.id)
  return NextResponse.json(evaluations)
}
