import { randomUUID } from 'node:crypto'
import { IsNull } from 'typeorm'
import { RefereeUnavailability, type UnavailabilityReasonCategory } from '@/entities/RefereeUnavailability'
import { getDataSource } from '@/lib/db'
import { validateDateRange } from '@/lib/refereeRules'
import { validateUnavailabilityRequest } from '@/lib/unavailabilityPolicy'
import { RefereeUnavailabilityPolicyService } from './RefereeUnavailabilityPolicyService'
import type {
  RefereeAvailabilityBatchRequest,
  RefereeAvailabilityBatchResult,
  RefereeAvailabilityCheckRequest,
  RefereeAvailabilityResult,
} from '../../../packages/domain-contracts/src/referee-availability'

export class AvailabilityError extends Error {}

export interface CreateUnavailabilityInput {
  startDate: string
  endDate: string
  reason?: string | null
  reasonCategory?: UnavailabilityReasonCategory
  proofDocumentUrl?: string | null
  recurrenceDaysOfWeek?: number[] | null
  recurrenceEndDate?: string | null
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

/** REF-003 — occurrences hebdomadaires sur les jours choisis, même durée que la première période, jusqu'à la date de fin de récurrence incluse. */
function buildRecurrenceOccurrences(
  startDate: string,
  endDate: string,
  daysOfWeek: number[],
  recurrenceEndDate: string,
): Array<{ startDate: string; endDate: string }> {
  const durationDays = Math.round(
    (new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) / (24 * 60 * 60 * 1000),
  )
  const occurrences: Array<{ startDate: string; endDate: string }> = []
  let cursor = startDate
  while (cursor <= recurrenceEndDate) {
    if (daysOfWeek.includes(dayOfWeek(cursor))) {
      occurrences.push({ startDate: cursor, endDate: addDays(cursor, durationDays) })
    }
    cursor = addDays(cursor, 1)
  }
  return occurrences
}

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

  private async assertNoOverlap(
    repo: Awaited<ReturnType<AvailabilityService['repository']>>,
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<void> {
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
  }

  /** REF-003 — préavis, durée maximale, récurrence et justificatif contrôlés par la policy en vigueur. */
  async createMine(userId: string, input: CreateUnavailabilityInput): Promise<RefereeUnavailability[]> {
    const validationError = validateDateRange(input.startDate, input.endDate)
    if (validationError) throw new AvailabilityError(validationError)

    const reasonCategory = input.reasonCategory ?? 'OTHER'
    const policy = await new RefereeUnavailabilityPolicyService().resolve()
    const policyError = validateUnavailabilityRequest(policy, {
      startDate: input.startDate,
      endDate: input.endDate,
      reasonCategory,
      proofDocumentUrl: input.proofDocumentUrl,
      recurrenceDaysOfWeek: input.recurrenceDaysOfWeek,
      recurrenceEndDate: input.recurrenceEndDate,
    })
    if (policyError) throw new AvailabilityError(policyError)

    const occurrences =
      input.recurrenceDaysOfWeek?.length && input.recurrenceEndDate
        ? buildRecurrenceOccurrences(input.startDate, input.endDate, input.recurrenceDaysOfWeek, input.recurrenceEndDate)
        : [{ startDate: input.startDate, endDate: input.endDate }]

    const repo = await this.repository()
    const recurrenceGroupId = occurrences.length > 1 ? randomUUID() : null
    const reason = input.reason?.trim().slice(0, 500) || null
    const proofDocumentUrl = input.proofDocumentUrl?.trim().slice(0, 500) || null

    const saved: RefereeUnavailability[] = []
    for (const occurrence of occurrences) {
      await this.assertNoOverlap(repo, userId, occurrence.startDate, occurrence.endDate)
      saved.push(
        await repo.save(
          repo.create({
            userId,
            startDate: occurrence.startDate,
            endDate: occurrence.endDate,
            reason,
            reasonCategory,
            proofDocumentUrl,
            recurrenceGroupId,
          }),
        ),
      )
    }
    return saved
  }

  async cancelMine(userId: string, id: number): Promise<void> {
    const repo = await this.repository()
    const period = await repo.findOne({ where: { id, userId, cancelledAt: IsNull() } })
    if (!period) throw new AvailabilityError('Indisponibilité introuvable')
    period.cancelledAt = new Date()
    await repo.save(period)
  }

  /** REF-003 — annule toutes les occurrences futures non annulées d'une récurrence. */
  async cancelRecurrenceGroupMine(userId: string, recurrenceGroupId: string): Promise<number> {
    const repo = await this.repository()
    const periods = await repo.find({
      where: { userId, recurrenceGroupId, cancelledAt: IsNull() },
    })
    if (periods.length === 0) throw new AvailabilityError('Récurrence introuvable')
    const now = new Date()
    for (const period of periods) period.cancelledAt = now
    await repo.save(periods)
    return periods.length
  }

  /** Referee-domain decision for one official on one calendar date. */
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

  /**
   * Batch variant used by federation-hub when rendering the designation
   * selector. One query replaces N service calls and preserves referee-hub as
   * the owner of availability data.
   */
  async checkAvailabilityBatch(
    input: RefereeAvailabilityBatchRequest,
  ): Promise<RefereeAvailabilityBatchResult> {
    const validationError = validateDateRange(input.date, input.date)
    if (validationError) throw new AvailabilityError(validationError)

    const userIds = [...new Set(input.userIds.map((id) => id.trim()).filter(Boolean))]
    const availabilityByUser: RefereeAvailabilityBatchResult['availabilityByUser'] = {}
    for (const userId of userIds) {
      availabilityByUser[userId] = { available: true, blockingPeriod: null }
    }
    if (userIds.length === 0) return { availabilityByUser }

    const periods = await (await this.repository())
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
