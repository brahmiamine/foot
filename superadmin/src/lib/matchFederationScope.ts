import type { DataSource } from 'typeorm'
import { Journee, Match, Saison, League } from './entities'

export async function getMatchLeagueId(dataSource: DataSource, matchId: string): Promise<string | null> {
  const match = await dataSource.getRepository(Match).findOne({ where: { id: matchId } })
  if (!match) return null
  const journee = await dataSource.getRepository(Journee).findOne({ where: { id: match.journee_id } })
  if (!journee) return null
  const saison = await dataSource.getRepository(Saison).findOne({ where: { id: journee.saison_id } })
  return saison?.league_id ?? null
}

export async function getMatchFederationId(dataSource: DataSource, matchId: string): Promise<string | null> {
  const leagueId = await getMatchLeagueId(dataSource, matchId)
  if (!leagueId) return null
  const league = await dataSource.getRepository(League).findOne({ where: { id: leagueId } })
  return league?.federation_id ?? null
}

export interface FederationMatchRow {
  id: string
  date: Date | null
  status: string
  equipe_home: { id: string; nom: string } | null
  equipe_away: { id: string; nom: string } | null
}

function mapMatch(match: Match): FederationMatchRow {
  return {
    id: match.id,
    date: match.date ?? null,
    status: match.status,
    equipe_home: match.equipe_home ? { id: match.equipe_home.id, nom: match.equipe_home.nom } : null,
    equipe_away: match.equipe_away ? { id: match.equipe_away.id, nom: match.equipe_away.nom } : null,
  }
}

export async function listMatchesForFederation(dataSource: DataSource, federationId: string, limit = 100): Promise<FederationMatchRow[]> {
  const rows = await dataSource
    .getRepository(Match)
    .createQueryBuilder('match')
    .innerJoin(Journee, 'journee', 'journee.id = match.journee_id')
    .innerJoin(Saison, 'saison', 'saison.id = journee.saison_id')
    .innerJoin(League, 'league', 'league.id = saison.league_id')
    .leftJoinAndSelect('match.equipe_home', 'equipe_home')
    .leftJoinAndSelect('match.equipe_away', 'equipe_away')
    .where('league.federation_id = :federationId', { federationId })
    .orderBy('match.date', 'DESC')
    .take(limit)
    .getMany()
  return rows.map(mapMatch)
}

export async function listMatchesForLeague(dataSource: DataSource, leagueId: string, limit = 100): Promise<FederationMatchRow[]> {
  const rows = await dataSource
    .getRepository(Match)
    .createQueryBuilder('match')
    .innerJoin(Journee, 'journee', 'journee.id = match.journee_id')
    .innerJoin(Saison, 'saison', 'saison.id = journee.saison_id')
    .leftJoinAndSelect('match.equipe_home', 'equipe_home')
    .leftJoinAndSelect('match.equipe_away', 'equipe_away')
    .where('saison.league_id = :leagueId', { leagueId })
    .orderBy('match.date', 'DESC')
    .take(limit)
    .getMany()
  return rows.map(mapMatch)
}
