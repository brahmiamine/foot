import { In } from 'typeorm'
import { unstable_cache } from 'next/cache'
import { getDataSource } from '../db'
import { Vote } from '../entities'
import { toPlainArray } from '../serialization'

async function fetchVotesByMatchIdsUncached(matchIds: string[]) {
  if (matchIds.length === 0) {
    return []
  }
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Vote>('votes')
  const rows = await repo.find({
    where: { match_id: In(matchIds) },
    relations: {
      arbitre: true,
    },
    order: { created_at: 'DESC' },
  })
  return toPlainArray(rows)
}

export const fetchVotesByMatchIds = unstable_cache(
  fetchVotesByMatchIdsUncached,
  ['fetchVotesByMatchIds'],
  { revalidate: 120 }
)

export async function fetchVotesByArbitre(arbitreId: string, filterSuspicious: boolean = true) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Vote>('votes')
  const rows = await repo.find({
    select: ['id', 'note_globale', 'criteres', 'created_at', 'match_id', 'device_fingerprint', 'ip_address'],
    where: { arbitre_id: arbitreId },
    order: { created_at: 'DESC' },
  })
  const votes = toPlainArray(rows) as Array<{
    id: string
    note_globale: number | string
    criteres: any
    created_at?: Date | string
    match_id?: string
  }>

  // Filtrer les votes suspects si demandé
  if (filterSuspicious) {
    const { filterSuspiciousVotesBatch } = await import('../voteFiltering')
    return await filterSuspiciousVotesBatch(votes)
  }

  return votes
}
