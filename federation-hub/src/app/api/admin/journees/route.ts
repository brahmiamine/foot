import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessLeague, canAccessPlatform } from '@/lib/adminAuth'
import { listJourneesForAdmin, createJourneeAdmin } from '@/lib/adminJournees'
import { logAdminAction } from '@/lib/auditLog'
import { getDataSource } from '@/lib/db'
import { getSaisonScope } from '@/lib/matchFederationScope'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const leagueId = canAccessPlatform(session) ? null : session.leagueId ?? null
    if (!canAccessPlatform(session) && !leagueId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const journees = await listJourneesForAdmin(leagueId)
    return NextResponse.json(journees)
  } catch (error) {
    console.error('Error fetching journees for admin:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const dataSource = await getDataSource()
    const scope = await getSaisonScope(dataSource, body.saison_id)
    if (!scope) return NextResponse.json({ error: 'Saison ou scope de ligue introuvable' }, { status: 404 })
    if (!canAccessLeague(session, scope.leagueId, scope.federationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const journee = await createJourneeAdmin(body, scope.leagueId)
    await logAdminAction({ request, action: 'create', entityType: 'journee', entityId: journee.id })
    return NextResponse.json(journee)
  } catch (error) {
    console.error('Error creating journee:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

