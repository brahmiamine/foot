import { SeasonRegulation } from '@/entities/Eligibility'
import { CoachQualificationRead } from '@/entities/MatchStaffAssignment'
import { getDataSource } from '@/lib/db'
import { meetsMinimumQualification } from '../../../../packages/regulatory-shared/src/coachQualification'
import type {
  HeadCoachQualificationCheckRequest,
  HeadCoachQualificationResult,
  StaffQualificationServicePort,
} from '../../../../packages/domain-contracts/src/staff-eligibility'

/**
 * Transitional shared-database adapter for federation-owned coach
 * qualifications and season requirements.
 */
export class SharedDatabaseStaffQualificationAdapter implements StaffQualificationServicePort {
  async checkHeadCoachQualification(
    input: HeadCoachQualificationCheckRequest,
  ): Promise<HeadCoachQualificationResult> {
    const ds = await getDataSource()
    const season = await ds.getRepository(SeasonRegulation).findOne({ where: { id: input.seasonId } })
    const requiredQualification = season?.minimumHeadCoachQualification ?? null
    if (!requiredQualification) return { eligible: true, requiredQualification: null }

    const qualifications = await ds
      .getRepository(CoachQualificationRead)
      .createQueryBuilder('qualification')
      .where(
        "qualification.staffId=:staffId AND qualification.clubId=:teamId AND qualification.status='VALID'",
        { staffId: input.staffId, teamId: input.clubId },
      )
      .andWhere('(qualification.expiresAt IS NULL OR qualification.expiresAt>=:matchDate)', {
        matchDate: input.matchDate,
      })
      .getMany()

    return {
      eligible: qualifications.some((item) =>
        meetsMinimumQualification(item.qualificationType, requiredQualification),
      ),
      requiredQualification,
    }
  }
}
