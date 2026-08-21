import { MatchOfficialAssignment, type MatchOfficialAssignmentRole } from '@/entities/MatchOfficialAssignment'
import { Match } from '@/entities/Match'
import { getDataSource } from '@/lib/db'
import { createRefereeAvailabilityAdapter } from '@/adapters/referee/createRefereeAvailabilityAdapter'
import type { RefereeAvailabilityPort } from '../../../packages/domain-contracts/src/referee-availability'
import {
  rankDesignationCandidates,
  type DesignationCandidateEvaluation,
  type DesignationCandidateInput,
  type DesignationPolicyValues,
} from '@/lib/designationPolicy'
import { MatchOfficialDesignationPolicyService } from './MatchOfficialDesignationPolicyService'

export interface DesignationCandidateHint {
  userId: string
  grade?: string | null
  distanceKm?: number | null
}

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
   * Runtime authorization truth. Passing a role narrows the assignment check
   * so callers can require CENTER_REFEREE rather than accepting any official
   * assignment on the match.
   */
  async findActiveAssignment(
    userId: string,
    matchId: string,
    role?: MatchOfficialAssignmentRole,
  ): Promise<MatchOfficialAssignment | null> {
    const repo = await this.getRepository()
    if (role) {
      return repo.findOne({ where: { userId, matchId, role, status: 'ACTIVE' } })
    }
    return repo.findOne({ where: { userId, matchId, status: 'ACTIVE' } })
  }

  /** Personal match list for the referee workspace: centre referee only. */
  async listActiveCenterRefereeMatches(userId: string, limit = 20): Promise<Match[]> {
    const dataSource = await getDataSource()
    return dataSource
      .getRepository(Match)
      .createQueryBuilder('match')
      .innerJoin(
        MatchOfficialAssignment,
        'assignment',
        `assignment.match_id = match.id
         AND assignment.user_id = :userId
         AND assignment.role = :role
         AND assignment.status = :status`,
        { userId, role: 'CENTER_REFEREE', status: 'ACTIVE' },
      )
      .leftJoinAndSelect('match.homeTeam', 'homeTeam')
      .leftJoinAndSelect('match.awayTeam', 'awayTeam')
      .leftJoinAndSelect('match.matchday', 'matchday')
      .orderBy('match.date IS NULL', 'DESC')
      .addOrderBy('ABS(DATEDIFF(match.date, CURDATE()))', 'ASC')
      .addOrderBy('match.date', 'ASC')
      .limit(limit)
      .getMany()
  }

  async listForMatch(matchId: string): Promise<MatchOfficialAssignment[]> {
    const repo = await this.getRepository()
    return repo.find({ where: { matchId }, order: { assignedAt: 'DESC' } })
  }

  /**
   * REF-006 — évalue/classe des candidats selon la policy de désignation
   * (mode + grade/dispo/repos/distance/historique). Lecture seule : ne
   * crée jamais d'affectation, `assign()` reste l'unique porte d'entrée
   * pour ça, avec sa garde de disponibilité indépendante du mode.
   */
  async rankCandidates(
    matchId: string,
    candidates: DesignationCandidateHint[],
  ): Promise<{ policy: DesignationPolicyValues; evaluations: DesignationCandidateEvaluation[] }> {
    const policy = await new MatchOfficialDesignationPolicyService().resolve()
    const dataSource = await getDataSource()
    const match = await dataSource.getRepository(Match).findOne({ where: { id: matchId } })
    if (!match) throw new MatchOfficialAssignmentError('Match introuvable')

    const inputs: DesignationCandidateInput[] = []
    for (const candidate of candidates) {
      let available = true
      if (match.date) {
        const availability = await this.refereeAvailability.checkAvailability({
          userId: candidate.userId,
          date: match.date.toISOString().slice(0, 10),
        })
        available = availability.available
      }

      const priorAssignments = await dataSource
        .getRepository(MatchOfficialAssignment)
        .createQueryBuilder('assignment')
        .leftJoinAndSelect('assignment.match', 'priorMatch')
        .where('assignment.user_id = :userId', { userId: candidate.userId })
        .andWhere('assignment.status = :status', { status: 'ACTIVE' })
        .andWhere('assignment.match_id != :matchId', { matchId })
        .getMany()

      let restHoursBeforeMatch: number | null = null
      if (match.date) {
        const gapsHours = priorAssignments
          .filter((assignment) => assignment.match?.date)
          .map((assignment) => Math.abs(match.date!.getTime() - assignment.match!.date!.getTime()) / (60 * 60 * 1000))
        restHoursBeforeMatch = gapsHours.length > 0 ? Math.min(...gapsHours) : null
      }

      inputs.push({
        userId: candidate.userId,
        available,
        grade: candidate.grade ?? null,
        distanceKm: candidate.distanceKm ?? null,
        restHoursBeforeMatch,
        priorAssignmentsCount: priorAssignments.length,
      })
    }

    return { policy, evaluations: rankDesignationCandidates(policy, inputs) }
  }
}
