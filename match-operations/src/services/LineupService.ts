import { createClubLineupAdapter } from '@/adapters/club/createClubLineupAdapter'
import type {
  ClubLineupReadPort,
  ClubMatchLineupEntry,
} from '../../../packages/domain-contracts/src/club-lineup'

/** Match-facing facade over the club-owned official lineup read boundary. */
export class LineupService {
  constructor(private readonly lineupReader: ClubLineupReadPort = createClubLineupAdapter()) {}

  findByMatch(matchId: string): Promise<ClubMatchLineupEntry[]> {
    return this.lineupReader.findByMatch(matchId)
  }

  findByMatchAndTeam(matchId: string, teamId: string): Promise<ClubMatchLineupEntry[]> {
    return this.lineupReader.findByMatchAndTeam(matchId, teamId)
  }
}
