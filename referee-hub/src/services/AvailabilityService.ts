import { IsNull } from 'typeorm'
import { RefereeUnavailability } from '@/entities/RefereeUnavailability'
import { getDataSource } from '@/lib/db'
import { validateDateRange } from '@/lib/refereeRules'
import type {
  RefereeAvailabilityCheckRequest,
  RefereeAvailabilityResult,
} from '../../../packages/domain-contracts/src/referee-availability'

export class AvailabilityError extends Error {}

export class AvailabilityService {
  private async repository() {
    return (await getDataSource()).getRepository(RefereeUnavailability)
  }

  async listMine(userId: string): Promise<RefereeUnavailability[]> {
    return (await this.repository()).find({
      where: { userId },
      order: { startDate: 'DESC', createdAt: 'DESC' },
    })
  }

  async createMine(
    userId: string,
    startDate: string,
    endDate: string,
    reason?: string | null,
  ): Promise<RefereeUnavailability> {
    const validationError = validateDateRange(startDate, endDate)
    if (validationError) throw new AvailabilityError(validationError)
    const repo = await this.repository()
    const overlapping = await repo
      .createQueryBuilder('period')
      .where('period.user_id = :userId', { userId })
      .andWhere('period.cancelled_at IS NULL')
      .andWhere('NOT (:endDate < period.start_date OR :startDate > period.end_date)', {
        startDate,
        endDate,
      })
      .getOne()
    if (overlapping) {
      throw new AvailabilityError('Cette période chevauche une indisponibilité existante')
    }
    return repo.save(
      repo.create({
        userId,
        startDate,
        endDate,
        reason: reason?.trim().slice(0, 500) || null,
      }),
    )
  }

  async cancelMine(userId: string, id: number): Promise<void> {
    const repo = await this.repository()
    const period = await repo.findOne({ where: { id, userId, cancelledAt: IsNull() } })
    if (!period) throw new AvailabilityError('Indisponibilité introuvable')
    period.cancelledAt = new Date()
    await repo.save(period)
  }

  /**
   * Referee-domain decision consumed by match assignment workflows.
   * Only active (non-cancelled) unavailability periods can block assignment.
   */
  async checkAvailability(
    input: RefereeAvailabilityCheckRequest,
  ): Promise<RefereeAvailabilityResult> {
    const validationError = validateDateRange(input.date, input.date)
    if (validationError) throw new AvailabilityError(validationError)

    const period = await (await this.repository())
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
