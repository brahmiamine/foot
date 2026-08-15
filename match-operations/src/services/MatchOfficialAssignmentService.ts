import { MatchOfficialAssignment, type MatchOfficialAssignmentRole } from '@/entities/MatchOfficialAssignment'
import { Match } from '@/entities/Match'
import { getDataSource } from '@/lib/db'
import { createRefereeAvailabilityAdapter } from '@/adapters/referee/createRefereeAvailabilityAdapter'
import type { RefereeAvailabilityPort } from '../../../packages/domain-contracts/src/referee-availability'

export class MatchOfficialAssignmentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MatchOfficialAssignmentError'
  }
}

export interface AssignOfficialInput {
  matchId: string
  userId: string
  role: MatchOfficialAssignmentRole
  refereeId?: string | null
  assignedBy?: string | null
}

/**
 * migration.md §11 (Phase 4): owns assignment records for match officials.
 * Referee availability is deliberately delegated to the referee domain through
 * RefereeAvailabilityPort instead of reading referee_unavailabilities here.
 */
export class MatchOfficialAssignmentService {
  constructor(
    private readonly refereeAvailability: RefereeAvailabilityPort =
      createRefereeAvailabilityAdapter(),
  ) {}

  private async getRepository() {
    const dataSource = await getDataSource()
    return dataSource.getRepository(MatchOfficialAssignment)
  }

  /** Idempotent: the same active user/role/match assignment is returned. */
  async assign(input: AssignOfficialInput): Promise<MatchOfficialAssignment> {
    const repo = await this.getRepository()
    const existing = await repo.findOne({
      where: {
        matchId: input.matchId,
        userId: input.userId,
        role: input.role,
        status: 'ACTIVE',
      },
    })
    if (existing) return existing

    const dataSource = await getDataSource()
    const match = await dataSource.getRepository(Match).findOne({ where: { id: input.matchId } })
    if (!match) throw new MatchOfficialAssignmentError('Match introuvable')

    if (match.date) {
      const matchDate = match.date.toISOString().slice(0, 10)
      const availability = await this.refereeAvailability.checkAvailability({
        userId: input.userId,
        date: matchDate,
      })
      if (!availability.available) {
        const period = availability.blockingPeriod
        const suffix = period
          ? ` du ${period.startDate} au ${period.endDate}`
          : ` le ${matchDate}`
        throw new MatchOfficialAssignmentError(`Cet officiel est indisponible${suffix}`)
      }
    }

    const assignment = repo.create({
      matchId: input.matchId,
      userId: input.userId,
      role: input.role,
      refereeId: input.refereeId ?? null,
      status: 'ACTIVE',
      assignedBy: input.assignedBy ?? null,
    })
    return repo.save(assignment)
  }

  async revoke(
    assignmentId: number,
    revokedBy?: string | null,
  ): Promise<MatchOfficialAssignment> {
    const repo = await this.getRepository()
    const assignment = await repo.findOne({ where: { id: assignmentId } })
    if (!assignment) {
      throw new MatchOfficialAssignmentError('Affectation introuvable')
    }
    if (assignment.status === 'REVOKED') {
      throw new MatchOfficialAssignmentError('Cette affectation est déjà révoquée')
    }
    assignment.status = 'REVOKED'
    assignment.revokedBy = revokedBy ?? null
    assignment.revokedAt = new Date()
    return repo.save(assignment)
  }

  /**
   * Truth used by [matchId]/layout.tsx: null when the user has no ACTIVE
   * assignment for this match; access is never inferred only from JWT role.
   */
  async findActiveAssignment(
    userId: string,
    matchId: string,
  ): Promise<MatchOfficialAssignment | null> {
    const repo = await this.getRepository()
    return repo.findOne({ where: { userId, matchId, status: 'ACTIVE' } })
  }

  async listForMatch(matchId: string): Promise<MatchOfficialAssignment[]> {
    const repo = await this.getRepository()
    return repo.find({ where: { matchId }, order: { assignedAt: 'DESC' } })
  }
}
