import { NextRequest, NextResponse } from 'next/server'
import { getOfficialEvalSession, canAccessPlatform } from '@/lib/adminAuth'
import { getEvaluationById, updateEvaluation, RefereeOfficialEvaluationError } from '@/lib/refereeOfficialEvaluations'

export const runtime = 'nodejs'

/**
 * PATCH /api/officiel/evaluations/:id — corrige un rapport DRAFT avant sa
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

  if (evaluation.observer_user_id !== session.id && !canAccessPlatform(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const updated = await updateEvaluation(id, {
      criteres: body.criteres,
      noteOfficielle: body.note_officielle,
      pointsForts: body.points_forts,
      pointsFaibles: body.points_faibles,
      recommandations: body.recommandations,
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof RefereeOfficialEvaluationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error updating referee official evaluation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
