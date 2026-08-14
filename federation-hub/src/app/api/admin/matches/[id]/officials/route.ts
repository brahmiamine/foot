import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessFederation, canAccessLeague, canAccessPlatform } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { getMatchScope } from '@/lib/matchFederationScope'
import { assignMatchOfficial, listMatchOfficials, MatchOfficialClientError } from '@/lib/matchOfficialClient'
import { logAdminAction } from '@/lib/auditLog'
import { notify } from '@/lib/notificationClient'

export const runtime = 'nodejs'

/**
 * GET/POST /api/admin/matches/:id/officials — migration.md §11, Phase 4.
 * `federation-hub` ne possède ni n'écrit `match_official_assignments` : il
 * appelle les routes internes service-à-service de `match-operations` (voir
 * lib/matchOfficialClient.ts), même pattern que le module transferts
 * (Phase 3).
 *
 * Autorisation dérivée de la fédération qui gouverne RÉELLEMENT ce match
 * (match → journée → saison → ligue → fédération, voir
 * lib/matchFederationScope.ts), jamais d'un identifiant fourni par le
 * client (migration.md §3).
 */
async function authorizeMatchScope(request: NextRequest, matchId: string) {
  const session = await getAdminSession(request)
  if (!session) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const dataSource = await getDataSource()
  const scope = await getMatchScope(dataSource, matchId)
  if (!scope) {
    return canAccessPlatform(session)
      ? { session, scope: null }
      : { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const authorized =
    canAccessPlatform(session) ||
    canAccessLeague(session, scope.leagueId, scope.federationId) ||
    canAccessFederation(session, scope.federationId)
  return authorized
    ? { session, scope }
    : { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await params
    const access = await authorizeMatchScope(request, matchId)
    if ('response' in access) return access.response
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

    const access = await authorizeMatchScope(request, matchId)
    if ('response' in access) return access.response
    const { session } = access

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

    await notify({
      eventId: `match-official-assigned:${assignment.id}`,
      type: 'MATCH_OFFICIAL_ASSIGNED',
      userId: assignment.userId,
      title: 'Nouvelle désignation officielle',
      body: `Vous avez été affecté à un match en tant que ${assignment.role}.`,
      data: { matchId, assignmentId: assignment.id, role: assignment.role, url: `${process.env.REFEREE_HUB_URL || 'http://localhost:3008'}/assignments/${assignment.id}` },
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
