import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessFederation } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { endAffiliation, getAffiliationById, setAffiliationStatus, TeamAffiliationError } from '@/lib/teamAffiliations'
import { toPlain } from '@/lib/serialization'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * Désaffiliation ou changement de statut (ex: SUSPENDED) d'une affiliation
 * précise (migration.md §6, §9) — jamais une suppression : l'historique
 * reste toujours en base. Le droit est vérifié sur la fédération qui
 * possède RÉELLEMENT cette affiliation (relue en base), jamais sur un
 * federation_id fourni par le client.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; affiliationId: string }> }
) {
  const { id: teamId, affiliationId } = await params

  try {
    const dataSource = await getDataSource()
    const affiliation = await getAffiliationById(dataSource, affiliationId)

    if (!affiliation || affiliation.teamId !== teamId) {
      return NextResponse.json({ error: 'Affiliation introuvable' }, { status: 404 })
    }

    const session = await getAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!canAccessFederation(session, affiliation.federationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status, end_date, notes } = body

    let updated
    if (status === 'ENDED') {
      if (!end_date) {
        return NextResponse.json({ error: 'end_date est requis pour clôturer une affiliation' }, { status: 400 })
      }
      updated = await endAffiliation(dataSource, { teamId, endDate: end_date, notes })
    } else if (status === 'SUSPENDED' || status === 'ACTIVE') {
      updated = await setAffiliationStatus(dataSource, affiliationId, status, notes)
    } else {
      return NextResponse.json({ error: 'status doit être ACTIVE, SUSPENDED ou ENDED' }, { status: 400 })
    }

    await logAdminAction({
      request,
      action: 'update',
      entityType: 'team_affiliation',
      entityId: affiliationId,
      summary: `Affiliation ${affiliationId} → ${status}`,
    })

    return NextResponse.json(toPlain(updated))
  } catch (error) {
    if (error instanceof TeamAffiliationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error updating team affiliation:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}
