import { getDataSource } from './db'
import { Player } from './entities'
import { toPlainArray } from './serialization'

export interface PlayerOption {
  id: string
  name: string
  number: number
  teamId: string
}

/**
 * migration.md §18-19 : liste (lecture seule) des joueurs d'un club,
 * référentiel `teamManager` répliqué dans `superadmin` via l'entité
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
