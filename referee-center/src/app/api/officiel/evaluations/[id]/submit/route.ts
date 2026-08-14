import { NextRequest, NextResponse } from 'next/server'
import { getOfficialEvalSession, canAccessPlatform } from '@/lib/adminAuth'
import { getEvaluationById, submitEvaluation, RefereeOfficialEvaluationError } from '@/lib/refereeOfficialEvaluations'

export const runtime = 'nodejs'

/** POST /api/officiel/evaluations/:id/submit — seul l'observateur auteur du rapport (ou PLATFORM_SUPERADMIN) peut le soumettre. */
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

  if (evaluation.observer_user_id !== session.id && !canAccessPlatform(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
