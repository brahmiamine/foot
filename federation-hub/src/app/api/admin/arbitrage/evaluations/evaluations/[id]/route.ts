import { NextRequest, NextResponse } from 'next/server'
import { getOfficialEvalSession } from '@/lib/adminAuth'
import { getEvaluationById, updateEvaluation, RefereeOfficialEvaluationError } from '@/lib/refereeOfficialEvaluations'
import { authorizeAssessmentResource, RefereeAssessmentAuthorizationError } from '@/lib/refereeAssessmentAuthorization'
import { calculateOfficialScore, OfficialCriterionScoreError } from '@/lib/officialRefereeCriteria'

export const runtime = 'nodejs'

/**
 * PATCH /api/admin/arbitrage/evaluations/evaluations/:id — corrige un rapport DRAFT avant sa
 * soumission (migration.md §12). Même garde que .../submit : seul
 * l'observateur auteur du rapport (ou PLATFORM_SUPERADMIN) peut le
 * modifier ; refusé dès que le rapport a quitté DRAFT (voir
 * `updateEvaluation`).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    authorizeAssessmentResource(session, evaluation, 'edit')
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const officialScore = body.criteres === undefined
      ? null
      : await calculateOfficialScore(body.criteres, { at: evaluation.criteria_effective_at })
    const updated = await updateEvaluation(id, {
      criteres: officialScore?.scores,
      noteOfficielle: officialScore?.note,
      pointsForts: body.points_forts,
      pointsFaibles: body.points_faibles,
      recommandations: body.recommandations,
      privateComment: body.private_comment,
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (
      error instanceof RefereeOfficialEvaluationError ||
      error instanceof RefereeAssessmentAuthorizationError ||
      error instanceof OfficialCriterionScoreError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error updating referee official evaluation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
