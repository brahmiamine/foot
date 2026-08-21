import { getDataSource } from './db'
import { Match } from './entities'
import type { ArbiNoteVotingScopeContext } from './votingPolicyService'

/**
 * ARBI-001 — dérive le scope fédération/ligue/saison d'un match pour la
 * résolution de policy, en suivant la chaîne référentielle déjà lue ailleurs
 * dans l'app (match -> journee -> saison -> league -> federation). ArbiNote
 * ne fait que LIRE ces tables (propriété federation-hub), jamais écrire.
 */
export async function resolveMatchVotingScope(matchId: string): Promise<ArbiNoteVotingScopeContext> {
  const dataSource = await getDataSource()
  const match = await dataSource.getRepository(Match).findOne({
    where: { id: matchId },
    relations: { journee: { saison: { league: { federation: true } } } },
  })
  if (!match) return {}

  const saison = match.journee?.saison
  const league = saison?.league
  return {
    seasonId: saison?.id ?? null,
    leagueId: league?.id ?? null,
    federationId: league?.federation?.id ?? null,
  }
}
