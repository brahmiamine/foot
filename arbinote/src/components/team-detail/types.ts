import { Team, Match, CritereDefinition } from '@/types'

export type TFunction = (key: string, params?: Record<string, string | number>) => string

export interface RefereeStat {
  arbitre: any
  matchCount: number
  averageNote: number
  voteCount: number
}

export interface TopMatch {
  match: Match
  average: number
  voteCount: number
}

export interface TeamDetailClientProps {
  team: Team
  matches: Match[]
  refereeStats: RefereeStat[]
  topMatchesArbitre: TopMatch[]
  topMatchesVar: TopMatch[]
  topMatchesAssistant: TopMatch[]
  criteresDefs: CritereDefinition[]
  matchRatings?: Record<string, { average: number; count: number }>
}
