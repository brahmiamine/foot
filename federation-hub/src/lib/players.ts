import { In } from 'typeorm'
import { getDataSource } from './db'
import { Player, Team, TeamAffiliation } from './entities'
import { toPlainArray } from './serialization'

export interface PlayerOption {
  id: string
  name: string
  number: number
  teamId: string
}

/**
 * migration.md §18-19 : liste (lecture seule) des joueurs d'un club,
 * référentiel `club-hub` répliqué dans `federation-hub` via l'entité
 * `Player` (déjà utilisée pour le fil des faits de match). Sert au
 * sélecteur `player_id` de l'écran Transferts.
 */
export async function listPlayersForTeam(teamId: string): Promise<PlayerOption[]> {
  const dataSource = await getDataSource()
  const players = await dataSource.getRepository(Player).find({
    where: { teamId },
    order: { lastNameFr: 'ASC' },
  })
  return toPlainArray(
    players.map((p) => ({
      id: p.id,
      name: `${p.firstNameFr} ${p.lastNameFr}`.trim(),
      number: p.number,
      teamId: p.teamId,
    }))
  )
}

export interface PlayerGlobalFilters {
  federationId?: string | null
  leagueId?: string | null
  saisonId?: string | null
  teamId?: string | null
  category?: string | null
  position?: string | null
  status?: string | null
  search?: string | null
}

export interface PlayerGlobalRow {
  id: string
  name: string
  number: number
  teamId: string
  teamName: string | null
  category: string
  position: string | null
  status: string
  isActive: boolean
}

export interface PlayerGlobalPage {
  items: PlayerGlobalRow[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * migration.md §18 : vue globale `/joueurs` — fédération/ligue/saison
 * résolus via `team_affiliations` (federation-hub), club/catégorie/poste/
 * statut directement sur `Player` (club-hub, lu ici en lecture seule).
 * Une affiliation correspondant au filtre suffit (pas nécessairement
 * `ACTIVE`) : un joueur d'un club qui a changé de ligue reste trouvable
 * pour l'historique, cohérent avec `listAffiliationsForFederation`.
 *
 * Pagination serveur obligatoire : l'ancienne limite silencieuse à 200
 * résultats est supprimée. `pageSize` est borné à 100 pour éviter les
 * réponses trop volumineuses tout en permettant un export/usage admin
 * confortable.
 */
export async function listPlayersGlobal(
  filters: PlayerGlobalFilters,
  page = 1,
  pageSize = 50,
): Promise<PlayerGlobalPage> {
  const dataSource = await getDataSource()
  const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1)
  const safePageSize = Math.min(100, Math.max(1, Number.isFinite(pageSize) ? Math.floor(pageSize) : 50))

  let restrictToTeamIds: string[] | null = null
  if (filters.federationId || filters.leagueId || filters.saisonId) {
    const where: Record<string, string> = {}
    if (filters.federationId) where.federationId = filters.federationId
    if (filters.leagueId) where.leagueId = filters.leagueId
    if (filters.saisonId) where.saisonId = filters.saisonId
    const affiliations = await dataSource.getRepository(TeamAffiliation).find({ where })
    restrictToTeamIds = [...new Set(affiliations.map((a) => a.teamId))]
    if (restrictToTeamIds.length === 0) {
      return { items: [], page: safePage, pageSize: safePageSize, total: 0, totalPages: 0 }
    }
  }

  const query = dataSource.getRepository(Player).createQueryBuilder('player')
  if (filters.teamId) {
    query.andWhere('player.teamId = :teamId', { teamId: filters.teamId })
  } else if (restrictToTeamIds) {
    query.andWhere('player.teamId IN (:...teamIds)', { teamIds: restrictToTeamIds })
  }
  if (filters.category) query.andWhere('player.category LIKE :category', { category: `%${filters.category}%` })
  if (filters.position) query.andWhere('player.position LIKE :position', { position: `%${filters.position}%` })
  if (filters.status) query.andWhere('player.status = :status', { status: filters.status })
  if (filters.search) {
    query.andWhere('(player.firstNameFr LIKE :q OR player.lastNameFr LIKE :q)', { q: `%${filters.search}%` })
  }

  query
    .orderBy('player.lastNameFr', 'ASC')
    .addOrderBy('player.firstNameFr', 'ASC')
    .skip((safePage - 1) * safePageSize)
    .take(safePageSize)

  const [players, total] = await query.getManyAndCount()
  const teamIds = [...new Set(players.map((p) => p.teamId))]
  const teams = teamIds.length ? await dataSource.getRepository(Team).find({ where: { id: In(teamIds) } }) : []
  const teamNames = new Map(teams.map((t) => [t.id, t.nom]))

  const items = toPlainArray(
    players.map((p) => ({
      id: p.id,
      name: `${p.firstNameFr} ${p.lastNameFr}`.trim(),
      number: p.number,
      teamId: p.teamId,
      teamName: teamNames.get(p.teamId) ?? null,
      category: p.category,
      position: p.position ?? null,
      status: p.status,
      isActive: p.isActive,
    }))
  )

  return {
    items,
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / safePageSize),
  }
}
