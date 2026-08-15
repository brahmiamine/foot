import { createIdentityProfileAdapter } from '@/adapters/identity/createIdentityProfileAdapter'
import { Assignment } from '@/entities/Assignment'
import { Referee } from '@/entities/Referee'
import { getDataSource } from '@/lib/db'
import type {
  IdentityProfilePort,
  IdentityUserProfile,
} from '../../../packages/domain-contracts/src/identity'
import { IsNull, Not } from 'typeorm'

export interface RefereeProfile {
  user: IdentityUserProfile
  referee: Referee | null
}

/**
 * Referee-owned profile orchestration. Account identity comes from Identity;
 * referee sporting data remains resolved locally from referee assignments.
 */
export class ProfileService {
  constructor(
    private readonly identityProfile: IdentityProfilePort = createIdentityProfileAdapter(),
  ) {}

  async getMine(userId: string): Promise<RefereeProfile | null> {
    const user = await this.identityProfile.getUserProfile(userId)
    if (!user) return null

    const dataSource = await getDataSource()
    const linkedAssignment = await dataSource.getRepository(Assignment).findOne({
      where: { userId, refereeId: Not(IsNull()) },
      relations: ['referee'],
      order: { assignedAt: 'DESC' },
    })
    return { user, referee: linkedAssignment?.referee ?? null }
  }
}
