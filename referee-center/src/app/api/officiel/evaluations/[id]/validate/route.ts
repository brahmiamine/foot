import { NextRequest, NextResponse } from 'next/server'
import { getOfficialEvalSession, canAccessFederation, canAccessPlatform } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { getMatchFederationId } from '@/lib/matchFederationScope'
import { getEvaluationById, validateEvaluation, RefereeOfficialEvaluationError } from '@/lib/refereeOfficialEvaluations'

export const runtime = 'nodejs'

/**
 * POST /api/officiel/evaluations/:id/validate — homologation fédérale
 * (migration.md §9/§12). Réservé au FEDERATION_ADMIN de la fédération qui
 * gouverne RÉELLEMENT le match évalué (résolu serveur, jamais un
 * federation_id fourni par le client — §3) ou PLATFORM_SUPERADMIN.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getOfficialEvalSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.role === 'REFEREE_OBSERVER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const evaluation = await getEvaluationById(id)
  if (!evaluation) {
    return NextResponse.json({ error: 'Évaluation introuvable' }, { status: 404 })
  }

  const dataSource = await getDataSource()
  const federationId = await getMatchFederationId(dataSource, evaluation.match_id)
  const authorized = federationId ? canAccessFederation(session, federationId) : canAccessPlatform(session)
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
