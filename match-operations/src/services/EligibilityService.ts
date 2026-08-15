import { createClubLineupAdapter } from '@/adapters/club/createClubLineupAdapter'
import { createPlayerEligibilityPort } from '@/adapters/regulatory/createRegulatoryAdapters'
import type { ClubLineupReadPort } from '../../../packages/domain-contracts/src/club-lineup'
import type {
  EligibilityCheckRequest,
  EligibilityContext,
  EligibilityResult,
  EligibilityServicePort,
} from '../../../packages/domain-contracts/src/eligibility'

export type { EligibilityContext } from '../../../packages/domain-contracts/src/eligibility'

export class LineupEligibilityError extends Error {
  constructor(public readonly failures: Array<{ playerId: string; reasons: string[] }>) {
    super(failures.map((failure) => `${failure.playerId}: ${failure.reasons.join(', ')}`).join(' | '))
    this.name = 'LineupEligibilityError'
  }
}

/**
 * Match-facing eligibility facade. Regulatory decisions and club-owned lineup
 * reads are both injected through explicit domain ports.
 */
export class EligibilityService implements EligibilityServicePort {
  constructor(
    private readonly playerEligibility: EligibilityServicePort = createPlayerEligibilityPort(),
    private readonly lineupReader: ClubLineupReadPort = createClubLineupAdapter(),
  ) {}

  checkPlayerEligibility(
    input: EligibilityCheckRequest,
    context: EligibilityContext = {},
  ): Promise<EligibilityResult> {
    return this.playerEligibility.checkPlayerEligibility(input, context)
  }

  async checkLineup(matchId: string, context: EligibilityContext = {}) {
    const lineups = await this.lineupReader.findByMatch(matchId)
    if (!lineups.length) {
      throw new LineupEligibilityError([{ playerId: 'LINEUP', reasons: ['EMPTY_LINEUP'] }])
    }

    return Promise.all(
      lineups.map(async (lineup) => ({
        playerId: lineup.playerId,
        teamId: lineup.teamId,
        result: await this.checkPlayerEligibility(
          { playerId: lineup.playerId, clubId: lineup.teamId, matchId },
          context,
        ),
      })),
    )
  }

  async assertLineupEligible(matchId: string, context: EligibilityContext = {}) {
    const results = await this.checkLineup(matchId, context)
    const failures = results
      .filter((item) => !item.result.eligible)
      .map((item) => ({ playerId: item.playerId, reasons: item.result.blockingReasons }))

    if (failures.length) throw new LineupEligibilityError(failures)
    return results
  }
}
