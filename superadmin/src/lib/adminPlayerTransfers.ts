import { In } from 'typeorm'
import { getDataSource } from './db'
import { Player, PlayerTransfer, Team } from './entities'
import { toPlain, toPlainArray } from './serialization'
import { notify } from './notificationClient'

export interface PlayerSummary {
  id: string
  firstNameFr: string
  firstNameAr: string | null
  lastNameFr: string
  lastNameAr: string | null
  number: number
  category: string
  position: string | null
  imageUrl: string | null
  isActive: boolean
  teamId: string
}

export interface ClubPlayers {
  team: { id: string; nom: string; nom_ar?: string | null; logo_url?: string | null }
  players: PlayerSummary[]
}

/**
 * Effectif de tous les clubs, groupé par club — lecture seule sur `Player`
 * (table teamManager, voir entities/Player.ts). N'affiche que les joueurs
 * rattachés à un club existant dans le référentiel `teams` (superadmin) ;
 * un `teamId` orphelin (club supprimé sans que teamManager n'ait mis à
 * jour ses joueurs) est affiché avec un club "inconnu" plutôt que masqué,
 * pour rester visible côté admin.
 */
export async function listPlayersByClub(): Promise<ClubPlayers[]> {
  const ds = await getDataSource()
  const players = await ds.getRepository(Player).find({ order: { lastNameFr: 'ASC', firstNameFr: 'ASC' } })
  if (players.length === 0) return []

  const teamIds = Array.from(new Set(players.map((p) => p.teamId)))
  const teams = await ds.getRepository(Team).find({ where: { id: In(teamIds) } })
  const teamById = new Map(teams.map((t) => [t.id, t]))

  const grouped = new Map<string, PlayerSummary[]>()
  for (const player of players) {
    const list = grouped.get(player.teamId) ?? []
    list.push({
      id: player.id,
      firstNameFr: player.firstNameFr,
      firstNameAr: player.firstNameAr ?? null,
      lastNameFr: player.lastNameFr,
      lastNameAr: player.lastNameAr ?? null,
      number: player.number,
      category: player.category,
      position: player.position ?? null,
      imageUrl: player.imageUrl ?? null,
      isActive: player.isActive,
      teamId: player.teamId,
    })
    grouped.set(player.teamId, list)
  }

  return Array.from(grouped.entries())
    .map(([teamId, list]) => {
      const team = teamById.get(teamId)
      return {
        team: team
          ? { id: team.id, nom: team.nom, nom_ar: team.nom_ar, logo_url: team.logo_url }
          : { id: teamId, nom: 'Club inconnu', nom_ar: null, logo_url: null },
        players: list,
      }
    })
    .sort((a, b) => a.team.nom.localeCompare(b.team.nom))
}

export interface TransferPlayerInput {
  playerId: string
  toTeamId: string
  note?: string | null
  performedBy: string
}

/**
 * Transfère un joueur d'un club à un autre : met à jour `Player.teamId`
 * (voir entities/Player.ts pour le double-écrivain assumé) et journalise
 * l'opération dans `player_transfers`, dans une seule transaction. Notifie
 * les deux clubs (même client que MATCH_CREATED/MATCH_CANCELLED, voir
 * lib/notificationClient.ts) — jamais bloquant si notification-api est
 * indisponible.
 */
export async function transferPlayer(input: TransferPlayerInput): Promise<ReturnType<typeof toPlain<PlayerTransfer>>> {
  const ds = await getDataSource()

  const { transfer, fromTeamId, toTeamId, playerName } = await ds.transaction(async (manager) => {
    const player = await manager.findOne(Player, { where: { id: input.playerId } })
    if (!player) {
      throw new Error('Joueur introuvable.')
    }

    const toTeam = await manager.findOne(Team, { where: { id: input.toTeamId, team_type: 'club' } })
    if (!toTeam) {
      throw new Error('Club de destination introuvable.')
    }
    if (player.teamId === input.toTeamId) {
      throw new Error('Le joueur appartient déjà à ce club.')
    }

    const fromTeamId = player.teamId
    const playerName = `${player.firstNameFr} ${player.lastNameFr}`.trim()

    player.teamId = input.toTeamId
    await manager.save(player)

    const transfer = manager.create(PlayerTransfer, {
      playerId: player.id,
      playerNameFr: playerName,
      playerNumber: player.number,
      fromTeamId,
      toTeamId: input.toTeamId,
      note: input.note?.trim() || null,
      performedBy: input.performedBy,
    })
    await manager.save(transfer)

    return { transfer, fromTeamId, toTeamId: input.toTeamId, playerName }
  })

  const teams = await ds.getRepository(Team).find({ where: { id: In([fromTeamId, toTeamId]) } })
  const teamById = new Map(teams.map((t) => [t.id, t]))
  const fromName = teamById.get(fromTeamId)?.nom ?? 'un club'
  const toName = teamById.get(toTeamId)?.nom ?? 'un club'

  const notifications: Array<{ teamId: string; title: string; body: string }> = [
    { teamId: fromTeamId, title: 'Joueur transféré', body: `${playerName} a quitté le club pour rejoindre ${toName}.` },
    { teamId: toTeamId, title: 'Nouveau joueur', body: `${playerName} a rejoint le club en provenance de ${fromName}.` },
  ]
  for (const { teamId, title, body } of notifications) {
    await notify({
      eventId: `player_transfer:${transfer.id}:${teamId}`,
      type: 'PLAYER_TRANSFERRED',
      target: { type: 'TEAM', teamId },
      teamId,
      category: 'PLAYER_TRANSFERRED',
      title,
      body,
      data: { playerId: transfer.playerId, fromTeamId, toTeamId },
    })
  }

  return toPlain(transfer)
}

export interface TransferHistoryEntry {
  id: string
  playerId: string
  playerNameFr: string
  playerNumber: number | null
  fromTeamId: string
  fromTeamName: string
  toTeamId: string
  toTeamName: string
  note: string | null
  performedBy: string | null
  transferredAt: Date
}

export interface TransferHistoryFilters {
  playerId?: string
  teamId?: string
}

/** Historique des transferts, plus récents d'abord — filtrable par joueur ou par club (émetteur ou destinataire). */
export async function listTransferHistory(filters: TransferHistoryFilters = {}): Promise<TransferHistoryEntry[]> {
  const ds = await getDataSource()
  const qb = ds.getRepository(PlayerTransfer).createQueryBuilder('t').orderBy('t.transferred_at', 'DESC').limit(200)

  if (filters.playerId) {
    qb.andWhere('t.player_id = :playerId', { playerId: filters.playerId })
  }
  if (filters.teamId) {
    qb.andWhere('(t.from_team_id = :teamId OR t.to_team_id = :teamId)', { teamId: filters.teamId })
  }

  const transfers = await qb.getMany()
  if (transfers.length === 0) return []

  const teamIds = Array.from(new Set(transfers.flatMap((t) => [t.fromTeamId, t.toTeamId])))
  const teams = await ds.getRepository(Team).find({ where: { id: In(teamIds) } })
  const teamById = new Map(teams.map((t) => [t.id, t.nom]))

  return toPlainArray(transfers).map((t) => ({
    id: t.id,
    playerId: t.playerId,
    playerNameFr: t.playerNameFr,
    playerNumber: t.playerNumber ?? null,
    fromTeamId: t.fromTeamId,
    fromTeamName: teamById.get(t.fromTeamId) ?? 'Club inconnu',
    toTeamId: t.toTeamId,
    toTeamName: teamById.get(t.toTeamId) ?? 'Club inconnu',
    note: t.note ?? null,
    performedBy: t.performedBy ?? null,
    transferredAt: t.transferredAt,
  }))
}
