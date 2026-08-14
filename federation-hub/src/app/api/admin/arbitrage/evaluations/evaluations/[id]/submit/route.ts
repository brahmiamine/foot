import { NextRequest, NextResponse } from 'next/server'
import { getOfficialEvalSession } from '@/lib/adminAuth'
import { getEvaluationById, submitEvaluation, RefereeOfficialEvaluationError } from '@/lib/refereeOfficialEvaluations'
import { authorizeAssessmentResource } from '@/lib/refereeAssessmentAuthorization'

export const runtime = 'nodejs'

/** POST /api/admin/arbitrage/evaluations/evaluations/:id/submit — seul l'observateur auteur du rapport (ou PLATFORM_SUPERADMIN) peut le soumettre. */
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
    authorizeAssessmentResource(session, evaluation, 'submit')
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Forbidden' }, { status: 403 })
  }

  try {
    const submitted = await submitEvaluation(id)
    return NextResponse.json(submitted)
  } catch (error) {
    if (error instanceof RefereeOfficialEvaluationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error submitting referee official evaluation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
