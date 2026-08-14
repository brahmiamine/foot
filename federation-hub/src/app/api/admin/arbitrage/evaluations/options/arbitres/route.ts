import { NextRequest, NextResponse } from 'next/server'
import { getRefereeDomainSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { Arbitre } from '@/lib/entities'

export async function GET(request: NextRequest) {
  const session = await getRefereeDomainSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 25))
  const offset = Math.max(0, Number(request.nextUrl.searchParams.get('offset')) || 0)
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const ds = await getDataSource()
  const qb = ds.getRepository(Arbitre).createQueryBuilder('arbitre').orderBy('arbitre.nom', 'ASC')

  if (session.role === 'REFEREE_OBSERVER') {
    qb.andWhere(`EXISTS (
      SELECT 1
      FROM match_official_assignments referee_assignment
      JOIN match_official_assignments observer_assignment
        ON observer_assignment.match_id = referee_assignment.match_id
      WHERE referee_assignment.referee_id = arbitre.id
        AND referee_assignment.status = 'ACTIVE'
        AND observer_assignment.user_id = :observerId
        AND observer_assignment.role = 'REFEREE_OBSERVER'
        AND observer_assignment.status = 'ACTIVE'
    )`, { observerId: session.id })
  } else if (session.role === 'LEAGUE_ADMIN') {
    qb.andWhere(`EXISTS (
      SELECT 1 FROM match_official_assignments moa
      JOIN matches m ON m.id = moa.match_id
      JOIN journees j ON j.id = m.journee_id
      JOIN saisons s ON s.id = j.saison_id
      WHERE moa.referee_id = arbitre.id AND moa.status = 'ACTIVE' AND s.league_id = :leagueId
    )`, { leagueId: session.leagueId ?? '__none__' })
  } else if (session.role === 'FEDERATION_ADMIN') {
    qb.andWhere(`EXISTS (
      SELECT 1 FROM match_official_assignments moa
      JOIN matches m ON m.id = moa.match_id
      JOIN journees j ON j.id = m.journee_id
      JOIN saisons s ON s.id = j.saison_id
      JOIN leagues l ON l.id = s.league_id
      WHERE moa.referee_id = arbitre.id AND moa.status = 'ACTIVE' AND l.federation_id = :federationId
    )`, { federationId: session.federationId ?? '__none__' })
  }
  if (q) qb.andWhere('(arbitre.nom LIKE :q OR arbitre.nom_en LIKE :q OR arbitre.nom_ar LIKE :q)', { q: `%${q}%` })
  const [items, total] = await qb.skip(offset).take(limit).getManyAndCount()
  return NextResponse.json({ items, total })
}
