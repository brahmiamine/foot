import { cookies } from 'next/headers'
import { getDataSource } from './db'
import { League } from './entities'

export const ACTIVE_LEAGUE_COOKIE = 'activeLeagueId'
const DEFAULT_FEDERATION_CODE = 'TUN'
const DEFAULT_LEAGUE_NAME = 'Ligue Professionnelle 1'

export async function getActiveLeagueId(): Promise<string | null> {
  const cookieStore = await cookies()
  const cookieLeagueId = cookieStore.get(ACTIVE_LEAGUE_COOKIE)?.value
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<League>('ligues')

  if (cookieLeagueId) {
    const exists = await repo.findOne({ where: { id: cookieLeagueId } })
    if (exists) {
      return cookieLeagueId
    }
  }

  const preferredLeague = await repo
    .createQueryBuilder('league')
    .leftJoinAndSelect('league.federation', 'federation')
    .where('federation.code = :code', { code: DEFAULT_FEDERATION_CODE })
    .andWhere('league.nom = :name', { name: DEFAULT_LEAGUE_NAME })
    .getOne()

  if (preferredLeague) {
    return preferredLeague.id
  }

  const [firstLeague] = await repo.find({
    order: { created_at: 'ASC', nom: 'ASC' },
    take: 1,
  })

  return firstLeague?.id ?? null
}


