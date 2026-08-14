import { NextRequest, NextResponse } from 'next/server'
import { canAccessFederation, canAccessLeague, canAccessPlatform, ensureAdminOrFederationAuth, getAdminSession } from '@/lib/adminAuth'
import { listOfficialAccounts } from '@/lib/clubAccounts'
import { getDataSource } from '@/lib/db'
import { Match } from '@/lib/entities'
import { getMatchScope } from '@/lib/matchFederationScope'

export const runtime = 'nodejs'

/**
 * GET /api/admin/officials — comptes SSO REFEREE/MATCH_OFFICIAL/
 * REFEREE_OBSERVER (migration.md §0/§11), utilisé par l'écran d'affectation
 * d'officiels de match (Phase 4) pour peupler le sélecteur `user_id`. Ces
 * comptes n'ont pas de scope fédéral propre (Phase 4) : lecture ouverte à
 * tout FEDERATION_ADMIN, pas de filtre supplémentaire à appliquer.
 */
export async function GET(request: NextRequest) {
  try {
    const matchId = request.nextUrl.searchParams.get('matchId')
    let matchDate: Date | null = null
    if (matchId) {
      const session = await getAdminSession(request)
      if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const dataSource = await getDataSource()
      const scope = await getMatchScope(dataSource, matchId)
      const allowed = canAccessPlatform(session) || Boolean(scope && (
        canAccessLeague(session, scope.leagueId, scope.federationId) || canAccessFederation(session, scope.federationId)
      ))
      if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      matchDate = (await dataSource.getRepository(Match).findOne({ where: { id: matchId } }))?.date ?? null
    } else {
      const unauthorized = await ensureAdminOrFederationAuth(request)
      if (unauthorized) return unauthorized
    }
    const officials = await listOfficialAccounts(matchDate)
    return NextResponse.json(officials)
  } catch (error) {
    console.error('Error fetching official accounts:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
