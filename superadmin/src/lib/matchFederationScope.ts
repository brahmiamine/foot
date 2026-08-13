import type { DataSource } from 'typeorm'
import { Journee, Match, Saison, League } from './entities'

/**
 * migration.md §9 : "affecter les arbitres autorisés" est un droit de
 * niveau fédération/ligue — résout la fédération qui gouverne un match
 * précis (match → journée → saison → ligue → fédération), pour vérifier
 * qu'un FEDERATION_ADMIN/LEAGUE_ADMIN a bien autorité dessus avant de
 * pouvoir affecter un officiel. `null` si la chaîne est incomplète
 * (saison sans ligue, ex. tournoi hors championnat) : dans ce cas, seul
 * PLATFORM_SUPERADMIN peut agir, jamais une supposition côté serveur.
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
