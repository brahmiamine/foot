import { NextRequest, NextResponse } from 'next/server'
import { getOfficialEvalSession } from '@/lib/adminAuth'
import { getEvaluationById, validateEvaluation, RefereeOfficialEvaluationError } from '@/lib/refereeOfficialEvaluations'
import { authorizeAssessmentResource } from '@/lib/refereeAssessmentAuthorization'

export const runtime = 'nodejs'

/**
 * POST /api/admin/arbitrage/evaluations/evaluations/:id/validate — homologation fédérale
 * (migration.md §9/§12). Réservé au FEDERATION_ADMIN de la fédération ou
 * au LEAGUE_ADMIN de la ligue qui gouverne RÉELLEMENT le match évalué (résolu serveur, jamais un
 * federation_id fourni par le client — §3) ou PLATFORM_SUPERADMIN.
 */
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
    const validated = await validateEvaluation(id, session.email)
    return NextResponse.json(validated)
  } catch (error) {
    if (error instanceof RefereeOfficialEvaluationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error validating referee official evaluation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
