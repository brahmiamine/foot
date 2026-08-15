import { MatchLineup } from '@/entities/MatchLineup'
import { getDataSource } from '@/lib/db'
import type {
  ClubLineupReadPort,
  ClubMatchLineupEntry,
} from '../../../../packages/domain-contracts/src/club-lineup'

function toContract(row: MatchLineup): ClubMatchLineupEntry {
  return {
    id: row.id,
    matchId: row.matchId,
    teamId: row.teamId,
    playerId: row.playerId,
    role: row.role,
    shirtNumber: row.shirtNumber ?? null,
    position: row.position ?? null,
    isCaptain: Boolean(row.isCaptain),
    player: row.player
      ? {
          id: row.player.id,
          firstNameFr: row.player.firstNameFr,
          lastNameFr: row.player.lastNameFr,
          firstNameAr: row.player.firstNameAr ?? null,
          lastNameAr: row.player.lastNameAr ?? null,
        }
      : null,
    team: row.team
      ? {
          id: row.team.id,
          name: row.team.nom,
          nameAr: row.team.nomAr ?? null,
        }
      : null,
  }
}

/** Transitional adapter while match-operations and club-hub share MariaDB. */
export class SharedDatabaseClubLineupAdapter implements ClubLineupReadPort {
  private async rows(matchId: string, teamId?: string): Promise<MatchLineup[]> {
    const repository = (await getDataSource()).getRepository(MatchLineup)
    return repository.find({
      where: teamId ? { matchId, teamId } : { matchId },
      relations: teamId ? ['player'] : ['player', 'team'],
      order: { role: 'ASC', shirtNumber: 'ASC' },
    })
  }

  async findByMatch(matchId: string): Promise<ClubMatchLineupEntry[]> {
    return (await this.rows(matchId)).map(toContract)
  }

  async findByMatchAndTeam(matchId: string, teamId: string): Promise<ClubMatchLineupEntry[]> {
    return (await this.rows(matchId, teamId)).map(toContract)
  }
}
