import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessLeague, canAccessPlatform } from '@/lib/adminAuth'
import { updateMatchAdmin, deleteMatchAdmin } from '@/lib/adminMatches'
import { logAdminAction } from '@/lib/auditLog'
import { ScheduleConflictError } from '@/lib/scheduleConflicts'
import { getDataSource } from '@/lib/db'
import { getJourneeScope, getMatchScope } from '@/lib/matchFederationScope'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const dataSource = await getDataSource()
    const currentScope = await getMatchScope(dataSource, id)
    if (
      !canAccessPlatform(session) &&
      (!currentScope || !canAccessLeague(session, currentScope.leagueId, currentScope.federationId))
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (body.journee_id) {
      const targetScope = await getJourneeScope(dataSource, body.journee_id)
      if (
        !canAccessPlatform(session) &&
        (!targetScope || !canAccessLeague(session, targetScope.leagueId, targetScope.federationId))
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    const { match, overriddenConflicts } = await updateMatchAdmin(id, body, currentScope?.leagueId ?? null)
    await logAdminAction({ request, action: 'update', entityType: 'match', entityId: id })
    if (overriddenConflicts.length > 0) {
      await logAdminAction({
        request,
        action: 'derogation',
        entityType: 'match',
        entityId: id,
        summary: `Conflit(s) de programmation outrepassé(s) : ${overriddenConflicts.map((c) => c.message).join(' ; ')} | Motif : ${body.derogation_reason ?? ''}`,
      })
    }
    return NextResponse.json(match)
  } catch (error) {
    console.error('Error updating match:', error)
    if (error instanceof ScheduleConflictError) {
      return NextResponse.json({ error: error.message, conflicts: error.conflicts }, { status: 409 })
    }
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const dataSource = await getDataSource()
    const scope = await getMatchScope(dataSource, id)
    if (!canAccessPlatform(session) && (!scope || !canAccessLeague(session, scope.leagueId, scope.federationId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await deleteMatchAdmin(id, scope?.leagueId ?? null)
    await logAdminAction({ request, action: 'delete', entityType: 'match', entityId: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting match:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

