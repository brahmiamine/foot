import { RefereeUnavailability } from '@/entities/RefereeUnavailability'
import { getDataSource } from '@/lib/db'
import type {
  RefereeAvailabilityCheckRequest,
  RefereeAvailabilityPort,
  RefereeAvailabilityResult,
} from '../../../../packages/domain-contracts/src/referee-availability'

/**
 * Transitional adapter for the legacy shared-database deployment.
 * Referee availability is owned by referee-hub; this adapter exists only until
 * every environment switches match-operations to the referee service API.
 */
export class SharedDatabaseRefereeAvailabilityAdapter implements RefereeAvailabilityPort {
  async checkAvailability(
    input: RefereeAvailabilityCheckRequest,
  ): Promise<RefereeAvailabilityResult> {
    const period = await (await getDataSource())
      .getRepository(RefereeUnavailability)
      .createQueryBuilder('period')
      .where('period.user_id = :userId', { userId: input.userId })
      .andWhere('period.cancelled_at IS NULL')
      .andWhere(':date BETWEEN period.start_date AND period.end_date', { date: input.date })
      .orderBy('period.start_date', 'ASC')
      .getOne()

    if (!period) return { available: true, blockingPeriod: null }

    return {
      available: false,
      blockingPeriod: {
        startDate: period.startDate,
        endDate: period.endDate,
        reason: period.reason ?? null,
      },
    }
  }
}
