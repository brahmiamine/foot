import { NextRequest, NextResponse } from 'next/server'
import { getRefereeDomainSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { Journee, League, Match, Saison } from '@/lib/entities'

export async function GET(request: NextRequest) {
  const session = await getRefereeDomainSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 25))
  const offset = Math.max(0, Number(request.nextUrl.searchParams.get('offset')) || 0)
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const ds = await getDataSource()
  const qb = ds.getRepository(Match).createQueryBuilder('match')
    .innerJoin(Journee, 'journee', 'journee.id = match.journee_id')
    .innerJoin(Saison, 'saison', 'saison.id = journee.saison_id')
    .innerJoin(League, 'league', 'league.id = saison.league_id')
    .leftJoinAndSelect('match.equipe_home', 'equipe_home')
    .leftJoinAndSelect('match.equipe_away', 'equipe_away')
    .orderBy('match.date', 'DESC')

  if (session.role === 'REFEREE_OBSERVER') {
    qb.andWhere(`EXISTS (
      SELECT 1 FROM match_official_assignments observer_assignment
      WHERE observer_assignment.match_id = match.id
        AND observer_assignment.user_id = :observerId
        AND observer_assignment.role = 'REFEREE_OBSERVER'
        AND observer_assignment.status = 'ACTIVE'
    )`, { observerId: session.id })
  } else if (session.role === 'LEAGUE_ADMIN') {
    qb.andWhere('league.id = :leagueId', { leagueId: session.leagueId ?? '__none__' })
  } else if (session.role === 'FEDERATION_ADMIN') {
    qb.andWhere('league.federation_id = :federationId', { federationId: session.federationId ?? '__none__' })
  }
  if (q) qb.andWhere('(equipe_home.nom LIKE :q OR equipe_away.nom LIKE :q)', { q: `%${q}%` })
  const [items, total] = await qb.skip(offset).take(limit).getManyAndCount()
  return NextResponse.json({ items, total })
}
