import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessFederation } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { listAffiliationsForFederation } from '@/lib/teamAffiliations'
import { toPlain } from '@/lib/serialization'

export const runtime = 'nodejs'

/**
 * GET /api/admin/federations/:id/affiliations — tous les clubs affiliés
 * (tous statuts) à cette fédération (migration.md §6/§9), pour l'écran
 * dédié `/admin/clubs-affilies` (FEDERATION_ADMIN n'a pas besoin du gros
 * écran générique `/admin/teams` pour ça). Gardé sur la fédération
 * RÉELLEMENT ciblée par l'URL, jamais un scope revendiqué côté client.
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
    const rows = await listAffiliationsForFederation(dataSource, federationId)
    return NextResponse.json(toPlain(rows))
  } catch (error) {
    console.error('Error listing federation affiliations:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}
