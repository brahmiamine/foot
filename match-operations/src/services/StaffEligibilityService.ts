import { createStaffQualificationPort } from '@/adapters/regulatory/createRegulatoryAdapters'
import { Match } from '@/entities/Match'
import { Matchday } from '@/entities/Matchday'
import { MatchStaffAssignment } from '@/entities/MatchStaffAssignment'
import { getDataSource } from '@/lib/db'
import type { StaffQualificationServicePort } from '../../../packages/domain-contracts/src/staff-eligibility'

export class StaffEligibilityError extends Error {
  constructor(public readonly failures: Array<{ teamId: string; reason: string }>) {
    super(failures.map((item) => `${item.teamId}: ${item.reason}`).join(' | '))
    this.name = 'StaffEligibilityError'
  }
}

/**
 * Match-owned orchestration for head-coach assignments. Federation-owned
 * qualification rules are delegated through StaffQualificationServicePort.
 * The default remains shared-DB until the federation regulatory HTTP boundary
 * is explicitly configured.
 */
export class StaffEligibilityService {
  constructor(
    private readonly staffQualification: StaffQualificationServicePort =
      createStaffQualificationPort(),
  ) {}

  async assertHeadCoachesEligible(matchId: string): Promise<void> {
    const ds = await getDataSource()
    const match = await ds.getRepository(Match).findOne({ where: { id: matchId } })
    if (!match) {
      throw new StaffEligibilityError([{ teamId: 'MATCH', reason: 'MATCH_NOT_FOUND' }])
    }

    const matchday = await ds.getRepository(Matchday).findOne({ where: { id: match.journeeId } })
    if (!matchday?.seasonId) {
      throw new StaffEligibilityError([{ teamId: 'MATCH', reason: 'SEASON_NOT_FOUND' }])
    }

    const failures: Array<{ teamId: string; reason: string }> = []
    const matchDate = match.date ?? new Date()

    for (const teamId of [match.equipeHome, match.equipeAway]) {
      const assignment = await ds.getRepository(MatchStaffAssignment).findOne({
        where: { matchId, teamId, role: 'HEAD_COACH' },
      })
      if (!assignment) {
        failures.push({ teamId, reason: 'HEAD_COACH_NOT_ASSIGNED' })
        continue
      }

      const qualification = await this.staffQualification.checkHeadCoachQualification({
        staffId: assignment.staffId,
        clubId: teamId,
        seasonId: matchday.seasonId,
        matchDate,
      })
      if (!qualification.eligible) {
        failures.push({
          teamId,
          reason: `HEAD_COACH_QUALIFICATION_REQUIRED:${qualification.requiredQualification ?? 'UNKNOWN'}`,
        })
      }
    }

    if (failures.length) throw new StaffEligibilityError(failures)
  }
}
