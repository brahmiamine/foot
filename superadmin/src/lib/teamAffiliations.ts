import { In, type DataSource } from 'typeorm'
import { Federation, League, Saison, Team, TeamAffiliation, type TeamAffiliationStatus } from './entities'

export class TeamAffiliationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TeamAffiliationError'
  }
}

/** `YYYY-MM-DD` - 1 jour, en arithmétique UTC pour ne jamais glisser d'un jour selon le fuseau du process. */
function dayBefore(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

export interface ChangeAffiliationInput {
  teamId: string
  federationId: string
  leagueId?: string | null
  saisonId?: string | null
  startDate: string
  notes?: string | null
  createdBy?: string | null
}

export interface EndAffiliationInput {
  teamId: string
  endDate: string
  notes?: string | null
}

/** Affiliation `ACTIVE` courante d'un club, ou `null` s'il n'en a aucune (jamais affilié, ou désaffilié). */
export async function getActiveAffiliation(
  dataSource: DataSource,
  teamId: string,
): Promise<TeamAffiliation | null> {
  const repo = dataSource.getRepository(TeamAffiliation)
  return repo.findOne({ where: { teamId, status: 'ACTIVE' } })
}

/** Historique complet d'affiliations d'un club, la plus récente d'abord. */
export async function listAffiliations(dataSource: DataSource, teamId: string): Promise<TeamAffiliation[]> {
  const repo = dataSource.getRepository(TeamAffiliation)
  return repo.find({ where: { teamId }, order: { startDate: 'DESC', createdAt: 'DESC' } })
}

export interface FederationAffiliationRow {
  affiliation: TeamAffiliation
  team: { id: string; nom: string; logo_url: string | null } | null
}

/**
 * Toutes les affiliations (tous statuts) rattachées à une fédération —
 * vue "clubs affiliés" pour un `FEDERATION_ADMIN` (migration.md §9), sans
 * passer par le gros écran générique `/admin/teams`. `ACTIVE` d'abord,
 * puis la plus récente.
 */
export async function listAffiliationsForFederation(dataSource: DataSource, federationId: string): Promise<FederationAffiliationRow[]> {
  const affiliationRepo = dataSource.getRepository(TeamAffiliation)
  const affiliations = await affiliationRepo.find({
    where: { federationId },
    order: { status: 'ASC', startDate: 'DESC' },
  })

  const teamIds = [...new Set(affiliations.map((a) => a.teamId))]
  const teams = teamIds.length ? await dataSource.getRepository(Team).find({ where: { id: In(teamIds) } }) : []
  const teamById = new Map(teams.map((t) => [t.id, { id: t.id, nom: t.nom, logo_url: t.logo_url ?? null }]))

  return affiliations.map((affiliation) => ({ affiliation, team: teamById.get(affiliation.teamId) ?? null }))
}

/**
 * migration.md §22 : appartenance historique d'un club à une date donnée
 * (`startDate <= date AND (endDate IS NULL OR endDate >= date)`), quel que
 * soit son statut actuel — une affiliation `SUSPENDED` reste la vérité
 * historique de ce à quoi le club appartenait à cette date. Destinée à être
 * réutilisée par `matchsheet` (Phase 4) pour vérifier l'appartenance d'un
 * joueur/club à la date d'un match plutôt qu'au jour de la requête.
 */
export async function getAffiliationAt(
  dataSource: DataSource,
  teamId: string,
  date: string,
): Promise<TeamAffiliation | null> {
  const repo = dataSource.getRepository(TeamAffiliation)
  const candidates = await repo
    .createQueryBuilder('affiliation')
    .where('affiliation.team_id = :teamId', { teamId })
    .andWhere('affiliation.start_date <= :date', { date })
    .andWhere('(affiliation.end_date IS NULL OR affiliation.end_date >= :date)', { date })
    .orderBy('affiliation.created_at', 'DESC')
    .getMany()
  return candidates[0] ?? null
}

async function assertReferencesExist(
  dataSource: DataSource,
  input: Pick<ChangeAffiliationInput, 'teamId' | 'federationId' | 'leagueId' | 'saisonId'>,
): Promise<void> {
  const team = await dataSource.getRepository(Team).findOne({ where: { id: input.teamId } })
  if (!team) throw new TeamAffiliationError('Équipe introuvable')

  const federation = await dataSource.getRepository(Federation).findOne({ where: { id: input.federationId } })
  if (!federation) throw new TeamAffiliationError('Fédération introuvable')

  if (input.leagueId) {
    const league = await dataSource.getRepository(League).findOne({ where: { id: input.leagueId } })
    if (!league) throw new TeamAffiliationError('Ligue introuvable')
    // migration.md §3 : ne jamais faire confiance à un couple fédération/ligue fourni sans le revérifier.
    if (league.federation_id !== input.federationId) {
      throw new TeamAffiliationError("Cette ligue n'appartient pas à la fédération indiquée")
    }
  }

  if (input.saisonId) {
    const saison = await dataSource.getRepository(Saison).findOne({ where: { id: input.saisonId } })
    if (!saison) throw new TeamAffiliationError('Saison introuvable')
    if (input.leagueId && saison.league_id && saison.league_id !== input.leagueId) {
      throw new TeamAffiliationError("Cette saison n'appartient pas à la ligue indiquée")
    }
  }
}

/**
 * Rattache un club à une fédération/ligue/saison, en clôturant l'affiliation
 * `ACTIVE` précédente s'il en existe une (promotion, relégation, changement
 * de ligue — migration.md §6) : jamais un simple UPDATE de la ligne
 * existante, toujours une nouvelle ligne, pour préserver l'historique.
 * Transaction unique : soit les deux écritures (clôture + création)
 * réussissent, soit aucune (migration.md §20 applique la même règle aux
 * transferts de joueurs).
 */
export async function changeAffiliation(
  dataSource: DataSource,
  input: ChangeAffiliationInput,
): Promise<TeamAffiliation> {
  await assertReferencesExist(dataSource, input)

  return dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(TeamAffiliation)
    const current = await repo.findOne({ where: { teamId: input.teamId, status: 'ACTIVE' } })

    if (current) {
      if (input.startDate <= current.startDate) {
        throw new TeamAffiliationError(
          "La nouvelle affiliation doit démarrer après le début de l'affiliation active en cours",
        )
      }
      current.status = 'ENDED'
      current.endDate = dayBefore(input.startDate)
      await repo.save(current)
    }

    const created = repo.create({
      teamId: input.teamId,
      federationId: input.federationId,
      leagueId: input.leagueId ?? null,
      saisonId: input.saisonId ?? null,
      status: 'ACTIVE',
      startDate: input.startDate,
      notes: input.notes ?? null,
      createdBy: input.createdBy ?? null,
    })
    return repo.save(created)
  })
}

/** Désaffiliation (migration.md §6) : clôture l'affiliation active sans en recréer une nouvelle. */
export async function endAffiliation(
  dataSource: DataSource,
  input: EndAffiliationInput,
): Promise<TeamAffiliation> {
  const repo = dataSource.getRepository(TeamAffiliation)
  const current = await repo.findOne({ where: { teamId: input.teamId, status: 'ACTIVE' } })
  if (!current) {
    throw new TeamAffiliationError('Aucune affiliation active pour ce club')
  }
  if (input.endDate < current.startDate) {
    throw new TeamAffiliationError("La date de fin ne peut pas précéder le début de l'affiliation")
  }
  current.status = 'ENDED'
  current.endDate = input.endDate
  if (input.notes) current.notes = input.notes
  return repo.save(current)
}

/**
 * Bascule administrative de statut sur une affiliation précise (ex:
 * `SUSPENDED` pour une sanction disciplinaire fédérale, sans y mettre fin
 * ni changer ses dates) — distincte de `changeAffiliation`/`endAffiliation`,
 * qui gèrent le cycle de vie normal (changement/fin).
 */
export async function setAffiliationStatus(
  dataSource: DataSource,
  affiliationId: string,
  status: TeamAffiliationStatus,
  notes?: string | null,
): Promise<TeamAffiliation> {
  const repo = dataSource.getRepository(TeamAffiliation)
  const affiliation = await repo.findOne({ where: { id: affiliationId } })
  if (!affiliation) {
    throw new TeamAffiliationError('Affiliation introuvable')
  }
  affiliation.status = status
  if (notes) affiliation.notes = notes
  return repo.save(affiliation)
}

export async function getAffiliationById(
  dataSource: DataSource,
  affiliationId: string,
): Promise<TeamAffiliation | null> {
  return dataSource.getRepository(TeamAffiliation).findOne({ where: { id: affiliationId } })
}
