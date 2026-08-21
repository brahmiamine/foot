import { NextRequest, NextResponse } from 'next/server'
import { getOfficialEvalSession, canAccessPlatform } from '@/lib/adminAuth'
import {
  createEvaluation,
  listEvaluationsForObserver,
  listEvaluationsPendingReview,
  RefereeOfficialEvaluationError,
} from '@/lib/refereeOfficialEvaluations'
import {
  assessmentScopeForSession,
  authorizeAssessmentCreation,
  RefereeAssessmentAuthorizationError,
} from '@/lib/refereeAssessmentAuthorization'
import { calculateOfficialScore, OfficialCriterionScoreError } from '@/lib/officialRefereeCriteria'

export const runtime = 'nodejs'

/**
 * GET /api/admin/arbitrage/evaluations/evaluations — écran officiel (migration.md §12,
 * Phase 5) : deux vues selon le rôle, jamais un identifiant/scope fourni
 * par le client. `REFEREE_OBSERVER` voit ses propres rapports (tous
 * statuts, y compris DRAFT à finaliser). `FEDERATION_ADMIN` voit la file
 * d'homologation (SUBMITTED) des matchs RÉELLEMENT gouvernés par sa
 * fédération (`session.federationId`, relu du JWT, jamais un paramètre de
 * requête). `PLATFORM_SUPERADMIN`/`SUPERADMIN` voient toute la file, sans
 * filtre de fédération.
 */
export async function GET(request: NextRequest) {
  const session = await getOfficialEvalSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const ownReports = request.nextUrl.searchParams.get('view') === 'mine'
    if (session.role === 'REFEREE_OBSERVER' || (ownReports && canAccessPlatform(session))) {
      const evaluations = await listEvaluationsForObserver(session.id)
      return NextResponse.json(evaluations)
    }
    const evaluations = await listEvaluationsPendingReview(assessmentScopeForSession(session))
    return NextResponse.json(evaluations)
  } catch (error) {
    console.error('Error listing referee official evaluations:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/admin/arbitrage/evaluations/evaluations — migration.md §12 (Phase 5). Réservé à
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
  if (session.role !== 'REFEREE_OBSERVER' && !canAccessPlatform(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { match_id, arbitre_id, criteres, private_comment, points_forts, points_faibles, recommandations } = body

    if (!match_id || !arbitre_id || !criteres) {
      return NextResponse.json(
        { error: 'match_id, arbitre_id et criteres sont requis' },
        { status: 400 },
      )
    }

    const scope = await authorizeAssessmentCreation(session, match_id, arbitre_id)
    const officialScore = await calculateOfficialScore(criteres)
    const evaluation = await createEvaluation({
      matchId: match_id,
      arbitreId: arbitre_id,
      observerUserId: session.id,
      evaluatorRole: session.role,
      federationId: scope.federationId,
      leagueId: scope.leagueId,
      criteres: officialScore.scores,
      criteriaEffectiveAt: officialScore.criteriaEffectiveAt,
      noteOfficielle: officialScore.note,
      pointsForts: points_forts,
      pointsFaibles: points_faibles,
      recommandations,
      privateComment: private_comment,
    })

    return NextResponse.json(evaluation, { status: 201 })
  } catch (error) {
    if (
      error instanceof RefereeOfficialEvaluationError ||
      error instanceof RefereeAssessmentAuthorizationError ||
      error instanceof OfficialCriterionScoreError
    ) {
      return NextResponse.json({ error: error.message }, { status: error instanceof RefereeAssessmentAuthorizationError ? error.status : 400 })
    }
    console.error('Error creating referee official evaluation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
