import { NextRequest, NextResponse } from 'next/server'
import { getOfficialEvalSession } from '@/lib/adminAuth'
import { getEvaluationById, rejectEvaluation, RefereeOfficialEvaluationError } from '@/lib/refereeOfficialEvaluations'
import { authorizeAssessmentResource } from '@/lib/refereeAssessmentAuthorization'

export const runtime = 'nodejs'

/** POST /api/admin/arbitrage/evaluations/evaluations/:id/reject — même garde que .../validate. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getOfficialEvalSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const evaluation = await getEvaluationById(id)
  if (!evaluation) {
    return NextResponse.json({ error: 'Évaluation introuvable' }, { status: 404 })
  }

  try {
    authorizeAssessmentResource(session, evaluation, 'review')
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'Non motivé'
    const rejected = await rejectEvaluation(id, session.email, reason)
    return NextResponse.json(rejected)
  } catch (error) {
    if (error instanceof RefereeOfficialEvaluationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error rejecting referee official evaluation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
