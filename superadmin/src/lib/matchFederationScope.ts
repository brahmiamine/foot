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

export interface FederationMatchRow {
  id: string
  date: Date | null
  status: string
  equipe_home: { id: string; nom: string } | null
  equipe_away: { id: string; nom: string } | null
}

/**
 * Matchs RÉELLEMENT gouvernés par une fédération (même jointure que
 * `getMatchFederationId`, en liste plutôt qu'en résolution unitaire) —
 * pour l'écran dédié `/admin/officiels-matchs` (migration.md §11, Phase 4),
 * qui évite le gros écran générique `/admin/matches` (réservé
 * PLATFORM_SUPERADMIN) pour un FEDERATION_ADMIN affectant des officiels
 * dans son seul périmètre.
 */
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

  return rows.map((match) => ({
    id: match.id,
    date: match.date ?? null,
    status: match.status,
    equipe_home: match.equipe_home ? { id: match.equipe_home.id, nom: match.equipe_home.nom } : null,
    equipe_away: match.equipe_away ? { id: match.equipe_away.id, nom: match.equipe_away.nom } : null,
  }))
}
