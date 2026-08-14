import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessLeague, canAccessPlatform } from '@/lib/adminAuth'
import { listMatchesForAdmin, createMatchAdmin } from '@/lib/adminMatches'
import { logAdminAction } from '@/lib/auditLog'
import { ScheduleConflictError } from '@/lib/scheduleConflicts'
import { getDataSource } from '@/lib/db'
import { getJourneeScope } from '@/lib/matchFederationScope'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get('limit')
  const journeeIdParam = searchParams.get('journeeId')
  const limit = limitParam ? Math.min(200, Math.max(1, Number(limitParam))) : 50
  const journeeId = journeeIdParam || null

  try {
    const leagueId = canAccessPlatform(session) ? null : session.leagueId ?? null
    if (!canAccessPlatform(session) && !leagueId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (journeeId && leagueId) {
      const dataSource = await getDataSource()
      const scope = await getJourneeScope(dataSource, journeeId)
      if (!scope || scope.leagueId !== leagueId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    const matches = await listMatchesForAdmin(limit, leagueId, journeeId)
    return NextResponse.json(matches)
  } catch (error) {
    console.error('Error fetching admin matches:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const dataSource = await getDataSource()
    const scope = await getJourneeScope(dataSource, body.journee_id)
    if (!scope) return NextResponse.json({ error: 'Journée ou scope de ligue introuvable' }, { status: 404 })
    if (!canAccessLeague(session, scope.leagueId, scope.federationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { match, overriddenConflicts } = await createMatchAdmin(body, scope.leagueId)
    await logAdminAction({ request, action: 'create', entityType: 'match', entityId: match.id })
    if (overriddenConflicts.length > 0) {
      await logAdminAction({
        request,
        action: 'derogation',
        entityType: 'match',
        entityId: match.id,
        summary: `Conflit(s) de programmation outrepassé(s) : ${overriddenConflicts.map((c) => c.message).join(' ; ')} | Motif : ${body.derogation_reason ?? ''}`,
      })
    }
    return NextResponse.json(match)
  } catch (error) {
    console.error('Error creating match:', error)
    // Message métier sûr à exposer tel quel (liste des conflits détectés,
    // pas un détail interne) : le client peut proposer une dérogation motivée.
    if (error instanceof ScheduleConflictError) {
      return NextResponse.json({ error: error.message, conflicts: error.conflicts }, { status: 409 })
    }
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}


