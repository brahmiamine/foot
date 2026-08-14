import { getDataSource } from './db'
import { RefereeMatchReport } from './entities'
import type { SsoUser } from './ssoSession'

/** Rapports SUBMITTED uniquement : les brouillons restent strictement privés dans referee-hub. */
export async function listSubmittedRefereeReports(session: SsoUser): Promise<RefereeMatchReport[]> {
  const dataSource = await getDataSource()
  const query = dataSource.getRepository(RefereeMatchReport)
    .createQueryBuilder('report')
    .leftJoinAndSelect('report.author', 'author')
    .innerJoinAndSelect('report.match', 'match')
    .innerJoinAndSelect('match.equipe_home', 'homeTeam')
    .innerJoinAndSelect('match.equipe_away', 'awayTeam')
    .innerJoinAndSelect('match.journee', 'journee')
    .innerJoinAndSelect('journee.saison', 'saison')
    .innerJoinAndSelect('saison.league', 'league')
    .where('report.status = :status', { status: 'SUBMITTED' })
    .orderBy('report.submitted_at', 'DESC')

  if (session.role === 'FEDERATION_ADMIN') {
    if (!session.federationId) return []
    query.andWhere('league.federation_id = :federationId', { federationId: session.federationId })
  } else if (session.role === 'LEAGUE_ADMIN') {
    if (!session.leagueId) return []
    query.andWhere('saison.league_id = :leagueId', { leagueId: session.leagueId })
  } else if (session.role !== 'SUPERADMIN' && session.role !== 'PLATFORM_SUPERADMIN') {
    return []
  }

  return query.getMany()
}
