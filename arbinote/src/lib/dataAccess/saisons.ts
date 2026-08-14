import { unstable_cache } from 'next/cache'
import { getDataSource } from '../db'
import { Saison } from '../entities'
import { toPlain, toPlainArray } from '../serialization'

export async function fetchFeaturedSaisons(limit = 2, leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Saison>('saisons')
  const rows = await repo.find({
    where: leagueId ? { league_id: leagueId } : undefined,
    order: { date_debut: 'DESC' },
    take: limit,
  })
  return toPlainArray(rows)
}

export async function fetchAllSaisons(leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Saison>('saisons')
  const rows = await repo.find({
    where: leagueId ? { league_id: leagueId } : undefined,
    order: { date_debut: 'ASC' },
  })
  return toPlainArray(rows)
}

export async function fetchSaisonById(id: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Saison>('saisons')
  const row = await repo.findOne({
    where: { id },
  })
  return toPlain(row)
}

async function fetchLatestSaisonUncached(leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Saison>('saisons')
  const qb = repo
    .createQueryBuilder('s')
    .orderBy('s.date_debut', 'DESC')
    .addOrderBy('s.created_at', 'DESC')
    .take(1)

  if (leagueId) {
    qb.where('s.league_id = :leagueId', { leagueId })
  }

  const row = await qb.getOne()
  return toPlain(row)
}

export const fetchLatestSaison = unstable_cache(
  fetchLatestSaisonUncached,
  ['fetchLatestSaison'],
  { revalidate: 120 }
)
