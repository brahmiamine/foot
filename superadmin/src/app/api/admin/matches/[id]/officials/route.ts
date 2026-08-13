import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessFederation, canAccessPlatform } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { getMatchFederationId } from '@/lib/matchFederationScope'
import { assignMatchOfficial, listMatchOfficials, MatchOfficialClientError } from '@/lib/matchOfficialClient'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * GET/POST /api/admin/matches/:id/officials — migration.md §11, Phase 4.
 * `superadmin` ne possède ni n'écrit `match_official_assignments` : il
 * appelle les routes internes service-à-service de `matchsheet` (voir
 * lib/matchOfficialClient.ts), même pattern que le module transferts
 * (Phase 3).
 *
 * Autorisation dérivée de la fédération qui gouverne RÉELLEMENT ce match
 * (match → journée → saison → ligue → fédération, voir
 * lib/matchFederationScope.ts), jamais d'un identifiant fourni par le
 * client (migration.md §3).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: matchId } = await params
    const officials = await listMatchOfficials(matchId)
    return NextResponse.json(officials)
  } catch (error) {
    if (error instanceof MatchOfficialClientError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error listing match officials:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await params
    const body = await request.json()
    const { user_id, role, referee_id } = body

    if (!user_id || !role) {
      return NextResponse.json({ error: 'user_id et role sont requis' }, { status: 400 })
    }

    const session = await getAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dataSource = await getDataSource()
    const federationId = await getMatchFederationId(dataSource, matchId)

    const authorized = federationId ? canAccessFederation(session, federationId) : canAccessPlatform(session)
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const assignment = await assignMatchOfficial(matchId, {
      userId: user_id,
      role,
      refereeId: referee_id ?? null,
      assignedBy: session.email,
    })

    await logAdminAction({
      request,
      action: 'create',
      entityType: 'match_official_assignment',
      entityId: String(assignment.id),
      summary: `Officiel ${user_id} affecté au match ${matchId} (${role})`,
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    if (error instanceof MatchOfficialClientError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error assigning match official:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}
