import { UserRole } from '@/entities/UserRole'
import { getDataSource } from '@/lib/database'
import type {
  ClubRbacAccessRequest,
  ClubRbacAccessResult,
  ClubRbacReadPort,
} from '../../../../packages/domain-contracts/src/club-access'

/** Transitional adapter while medical-hub and club-hub still share MariaDB. */
export class SharedDatabaseClubRbacAdapter implements ClubRbacReadPort {
  async getEffectiveAccess(input: ClubRbacAccessRequest): Promise<ClubRbacAccessResult> {
    const assignments = await (await getDataSource()).getRepository(UserRole).find({
      where: { teamId: input.teamId, userId: input.userId },
      relations: ['role'],
    })

    let allCategories = false
    const permissions = new Set<string>()
    const categories = new Set<string>()

    for (const assignment of assignments) {
      const role = assignment.role
      if (!role) continue
      try {
        const parsed = JSON.parse(role.permissions)
        if (Array.isArray(parsed)) {
          for (const key of parsed) if (typeof key === 'string') permissions.add(key)
        }
      } catch {
        // Preserve historical fail-soft behavior for malformed permission JSON.
      }
      if (role.isGlobal) allCategories = true
      else if (assignment.category) categories.add(assignment.category)
    }

    return {
      permissions: Array.from(permissions),
      categories: allCategories ? 'ALL' : Array.from(categories),
    }
  }
}
