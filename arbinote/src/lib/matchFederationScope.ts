import type { DataSource } from 'typeorm'
import { Journee, Match, Saison, League } from './entities'

/**
 * migration.md §9 : résout la fédération qui gouverne un match précis
 * (match → journée → saison → ligue → fédération) — même logique que
 * superadmin/src/lib/matchFederationScope.ts, dupliquée ici car arbinote
 * lit ces tables référentielles directement (même base, voir
 * db/OWNERSHIP.md) sans passer par une API superadmin. `null` si la
 * chaîne est incomplète (saison sans ligue) : dans ce cas, seul
 * PLATFORM_SUPERADMIN peut valider/rejeter une évaluation officielle.
 */
export async function getMatchFederationId(dataSource: DataSource, matchId: string): Promise<string | null> {
  const match = await dataSource.getRepository(Match).findOne({ where: { id: matchId } })
  if (!match) return null

  const journee = await dataSource.getRepository(Journee).findOne({ where: { id: match.journee_id } })
  if (!journee) return null

  const saison = await dataSource.getRepository(Saison).findOne({ where: { id: journee.saison_id } })
  if (!saison?.league_id) return null

  const league = await dataSource.getRepository(League).findOne({ where: { id: saison.league_id } })
  return league?.federation_id ?? null
}
