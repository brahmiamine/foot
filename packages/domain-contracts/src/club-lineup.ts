export type ClubLineupRole = 'STARTER' | 'SUBSTITUTE'

export interface ClubLineupPlayerSummary {
  id: string
  firstNameFr: string
  lastNameFr: string
  firstNameAr?: string | null
  lastNameAr?: string | null
}

export interface ClubLineupTeamSummary {
  id: string
  name: string
  nameAr?: string | null
}

export interface ClubMatchLineupEntry {
  id: number
  matchId: string
  teamId: string
  playerId: string
  role: ClubLineupRole
  shirtNumber?: number | null
  position?: string | null
  isCaptain: boolean
  player?: ClubLineupPlayerSummary | null
  team?: ClubLineupTeamSummary | null
}

/**
 * Read boundary owned by the Club domain for official match compositions.
 * Match operations may consume the prepared lineup but must not know the
 * persistence model behind cms_match_lineups.
 */
export interface ClubLineupReadPort {
  findByMatch(matchId: string): Promise<ClubMatchLineupEntry[]>
  findByMatchAndTeam(matchId: string, teamId: string): Promise<ClubMatchLineupEntry[]>
}
