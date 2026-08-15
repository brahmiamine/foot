import { MatchLineup } from '@/entities/MatchLineup'
import { getDataSource } from '@/lib/db'
import { SharedDatabaseEligibilityAdapter } from '@/adapters/regulatory/SharedDatabaseEligibilityAdapter'
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
 * Match-facing eligibility facade.
 *
 * Match workflows depend on this class while the regulatory data source is
 * injected through EligibilityServicePort. Today the default adapter reads the
 * shared MariaDB; a federation/regulatory HTTP adapter can replace it later
 * without changing pre-match actions or lineup blocking semantics.
 */
export class EligibilityService implements EligibilityServicePort {
  constructor(
    private readonly playerEligibility: EligibilityServicePort = new SharedDatabaseEligibilityAdapter(),
  ) {}

  checkPlayerEligibility(
    input: EligibilityCheckRequest,
    context: EligibilityContext = {},
  ): Promise<EligibilityResult> {
    return this.playerEligibility.checkPlayerEligibility(input, context)
  }

  async checkLineup(matchId: string, context: EligibilityContext = {}) {
    const ds = await getDataSource()
    const lineups = await ds.getRepository(MatchLineup).find({ where: { matchId } })
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
