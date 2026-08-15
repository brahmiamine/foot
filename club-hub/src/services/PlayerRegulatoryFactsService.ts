import { getDataSource } from '@/lib/database'
import type {
  ClubPlayerRegulatoryFacts,
  ClubPlayerRegulatoryFactsRequest,
  ClubPlayerRegulatoryFactsPort,
} from '../../../packages/domain-contracts/src/club-player-facts'

export class PlayerRegulatoryFactsService implements ClubPlayerRegulatoryFactsPort {
  async getPlayerRegulatoryFacts(
    input: ClubPlayerRegulatoryFactsRequest,
  ): Promise<ClubPlayerRegulatoryFacts> {
    const dataSource = await getDataSource()
    const at = new Date(input.at)
    if (Number.isNaN(at.getTime())) throw new Error('Date de référence invalide')

    const [membershipRows, suspensionRows, playerRows] = await Promise.all([
      dataSource.query(
        `SELECT COUNT(*) AS count
           FROM cms_team_members
          WHERE player_id = ?
            AND team_id = ?
            AND status IN ('ACTIVE','ENDED')
            AND start_date <= ?
            AND (end_date IS NULL OR end_date >= ?)`,
        [input.playerId, input.clubId, at, at],
      ) as Promise<Array<{ count: number | string }>>,
      dataSource.query(
        `SELECT COUNT(*) AS count
           FROM Suspension
          WHERE playerId = ?
            AND (teamId IS NULL OR teamId = ?)
            AND status = 'ACTIVE'
            AND matchesPurged < COALESCE(overrideMatchesCount, matchesCount)`,
        [input.playerId, input.clubId],
      ) as Promise<Array<{ count: number | string }>>,
      dataSource.query(
        `SELECT birthDate
           FROM Player
          WHERE id = ?
          LIMIT 1`,
        [input.playerId],
      ) as Promise<Array<{ birthDate: Date | string | null }>>,
    ])

    const birthDate = playerRows[0]?.birthDate
    return {
      hasActiveMembership: Number(membershipRows[0]?.count ?? 0) > 0,
      hasActiveSuspension: Number(suspensionRows[0]?.count ?? 0) > 0,
      birthDate: birthDate ? new Date(birthDate).toISOString().slice(0, 10) : null,
    }
  }
}
