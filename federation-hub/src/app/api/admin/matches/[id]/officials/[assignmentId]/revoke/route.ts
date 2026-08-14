import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessFederation, canAccessLeague, canAccessPlatform } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { getMatchScope } from '@/lib/matchFederationScope'
import { revokeMatchOfficial, MatchOfficialClientError } from '@/lib/matchOfficialClient'
import { logAdminAction } from '@/lib/auditLog'
import { notify } from '@/lib/notificationClient'

export const runtime = 'nodejs'

/** POST /api/admin/matches/:id/officials/:assignmentId/revoke — migration.md §11, Phase 4. Même garde que POST .../officials. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  try {
    const { id: matchId, assignmentId } = await params

    const session = await getAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dataSource = await getDataSource()
    const scope = await getMatchScope(dataSource, matchId)
    const authorized = scope
      ? canAccessPlatform(session) ||
        canAccessLeague(session, scope.leagueId, scope.federationId) ||
        canAccessFederation(session, scope.federationId)
      : canAccessPlatform(session)
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const assignment = await revokeMatchOfficial(matchId, Number(assignmentId), session.email)

    await logAdminAction({
      request,
      action: 'update',
      entityType: 'match_official_assignment',
      entityId: assignmentId,
      summary: `Affectation ${assignmentId} révoquée pour le match ${matchId}`,
    })

    await notify({
      eventId: `match-official-revoked:${assignment.id}`,
      type: 'MATCH_OFFICIAL_REVOKED',
      userId: assignment.userId,
      title: 'Désignation modifiée',
      body: 'Une de vos désignations officielles a été révoquée.',
      data: { matchId, assignmentId: assignment.id, role: assignment.role, url: `${process.env.REFEREE_HUB_URL || 'http://localhost:3008'}/assignments/${assignment.id}` },
    })

    return NextResponse.json(assignment)
  } catch (error) {
    if (error instanceof MatchOfficialClientError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error revoking match official assignment:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}
