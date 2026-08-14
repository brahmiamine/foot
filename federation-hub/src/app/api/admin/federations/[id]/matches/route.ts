import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessFederation } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { listMatchesForFederation } from '@/lib/matchFederationScope'
import { toPlain } from '@/lib/serialization'

export const runtime = 'nodejs'

/**
 * GET /api/admin/federations/:id/matches — matchs RÉELLEMENT gouvernés par
 * cette fédération (migration.md §11, Phase 4), pour l'écran dédié
 * `/admin/officiels-matchs`. Gardé sur la fédération de l'URL, jamais un
 * scope revendiqué côté client.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: federationId } = await params
  if (!canAccessFederation(session, federationId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const dataSource = await getDataSource()
    const matches = await listMatchesForFederation(dataSource, federationId)
    return NextResponse.json(toPlain(matches))
  } catch (error) {
    console.error('Error listing federation matches:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}
