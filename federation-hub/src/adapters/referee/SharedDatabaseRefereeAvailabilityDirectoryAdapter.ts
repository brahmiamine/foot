import { getDataSource } from '@/lib/db'
import { RefereeUnavailability } from '@/lib/entities/RefereeUnavailability'
import type {
  RefereeAvailabilityBatchRequest,
  RefereeAvailabilityBatchResult,
  RefereeAvailabilityDirectoryPort,
} from '../../../../packages/domain-contracts/src/referee-availability'

/** Transitional read adapter until federation-hub consumes referee-hub via HTTP. */
export class SharedDatabaseRefereeAvailabilityDirectoryAdapter
  implements RefereeAvailabilityDirectoryPort
{
  async checkAvailabilityBatch(
    input: RefereeAvailabilityBatchRequest,
  ): Promise<RefereeAvailabilityBatchResult> {
    const userIds = [...new Set(input.userIds.map((id) => id.trim()).filter(Boolean))]
    const availabilityByUser: RefereeAvailabilityBatchResult['availabilityByUser'] = {}
    for (const userId of userIds) {
      availabilityByUser[userId] = { available: true, blockingPeriod: null }
    }
    if (userIds.length === 0) return { availabilityByUser }

    const periods = await (await getDataSource())
      .getRepository(RefereeUnavailability)
      .createQueryBuilder('period')
      .where('period.user_id IN (:...userIds)', { userIds })
      .andWhere('period.cancelled_at IS NULL')
      .andWhere(':date BETWEEN period.start_date AND period.end_date', { date: input.date })
      .orderBy('period.start_date', 'ASC')
      .getMany()

    for (const period of periods) {
      if (availabilityByUser[period.userId]?.available === false) continue
      availabilityByUser[period.userId] = {
        available: false,
        blockingPeriod: {
          startDate: period.startDate,
          endDate: period.endDate,
          reason: period.reason ?? null,
        },
      }
    }

    return { availabilityByUser }
  }
}
