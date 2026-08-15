import { User } from '@/entities/User'
import { getDataSource } from '@/lib/db'
import type {
  IdentityProfilePort,
  IdentityRole,
  IdentityUserProfile,
} from '../../../../packages/domain-contracts/src/identity'

/** Transitional adapter while referee-hub and Identity still share MariaDB. */
export class SharedDatabaseIdentityProfileAdapter implements IdentityProfilePort {
  async getUserProfile(id: string): Promise<IdentityUserProfile | null> {
    const user = await (await getDataSource()).getRepository(User).findOne({ where: { id } })
    if (!user) return null

    return {
      id: user.id,
      name: user.name,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      phoneNumber: user.phoneNumber ?? null,
      email: user.email,
      role: user.role as IdentityRole,
    }
  }
}
