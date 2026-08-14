import { NextRequest, NextResponse } from 'next/server'
import { getOfficialEvalSession } from '@/lib/adminAuth'
import { listEvaluationsForArbitre } from '@/lib/refereeOfficialEvaluations'

export const runtime = 'nodejs'

/** GET /api/officiel/arbitres/:arbitreId/evaluations — historique par arbitre (migration.md §12). Lecture ouverte à tout rôle d'évaluation officielle. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ arbitreId: string }> }) {
  const session = await getOfficialEvalSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { arbitreId } = await params
  const evaluations = await listEvaluationsForArbitre(arbitreId)
  return NextResponse.json(evaluations)
}
