import { NextRequest, NextResponse } from 'next/server'
import { getOfficialEvalSession } from '@/lib/adminAuth'
import { createEvaluation, RefereeOfficialEvaluationError } from '@/lib/refereeOfficialEvaluations'

export const runtime = 'nodejs'

/**
 * POST /api/officiel/evaluations — migration.md §12 (Phase 5). Réservé à
 * REFEREE_OBSERVER (auteur du rapport, `observer_user_id` = sa propre
 * session — jamais un identifiant fourni par le client) et
 * PLATFORM_SUPERADMIN/SUPERADMIN. Domaine strictement séparé de la
 * notation publique (`votes`), voir lib/refereeOfficialEvaluations.ts.
 */
export async function POST(request: NextRequest) {
  const session = await getOfficialEvalSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.role === 'FEDERATION_ADMIN') {
    // La fédération valide/rejette (voir .../validate, .../reject) mais ne rédige pas le rapport elle-même.
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { match_id, arbitre_id, criteres, note_officielle, points_forts, points_faibles, recommandations } = body

    if (!match_id || !arbitre_id || !criteres || note_officielle === undefined) {
      return NextResponse.json(
        { error: 'match_id, arbitre_id, criteres et note_officielle sont requis' },
        { status: 400 },
      )
    }

    const evaluation = await createEvaluation({
      matchId: match_id,
      arbitreId: arbitre_id,
      observerUserId: session.id,
      criteres,
      noteOfficielle: note_officielle,
      pointsForts: points_forts,
      pointsFaibles: points_faibles,
      recommandations,
    })

    return NextResponse.json(evaluation, { status: 201 })
  } catch (error) {
    if (error instanceof RefereeOfficialEvaluationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating referee official evaluation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
