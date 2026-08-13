import { NextRequest, NextResponse } from 'next/server'
import { getOfficialEvalSession } from '@/lib/adminAuth'
import { getRefereeOfficialStats } from '@/lib/refereeOfficialEvaluations'

export const runtime = 'nodejs'

/** GET /api/officiel/arbitres/:arbitreId/stats — statistiques de performance, migration.md §12 ("aide aux promotions/désignations/formations"). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ arbitreId: string }> }) {
  const session = await getOfficialEvalSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { arbitreId } = await params
  const stats = await getRefereeOfficialStats(arbitreId)
  return NextResponse.json(stats)
}
