import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessLeague, canAccessPlatform } from '@/lib/adminAuth'
import { updateJourneeAdmin, deleteJourneeAdmin } from '@/lib/adminJournees'
import { logAdminAction } from '@/lib/auditLog'
import { getDataSource } from '@/lib/db'
import { getJourneeScope, getSaisonScope } from '@/lib/matchFederationScope'

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
    const currentScope = await getJourneeScope(dataSource, id)
    if (
      !canAccessPlatform(session) &&
      (!currentScope || !canAccessLeague(session, currentScope.leagueId, currentScope.federationId))
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (body.saison_id) {
      const targetScope = await getSaisonScope(dataSource, body.saison_id)
      if (
        !canAccessPlatform(session) &&
        (!targetScope || !canAccessLeague(session, targetScope.leagueId, targetScope.federationId))
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    const journee = await updateJourneeAdmin(id, body, currentScope?.leagueId ?? null)
    await logAdminAction({ request, action: 'update', entityType: 'journee', entityId: id })
    return NextResponse.json(journee)
  } catch (error) {
    console.error('Error updating journee:', error)
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
    const scope = await getJourneeScope(dataSource, id)
    if (!canAccessPlatform(session) && (!scope || !canAccessLeague(session, scope.leagueId, scope.federationId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await deleteJourneeAdmin(id, scope?.leagueId ?? null)
    await logAdminAction({ request, action: 'delete', entityType: 'journee', entityId: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting journee:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}
