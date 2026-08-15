import { createClubIdentityAdapter, type ClubIdentityPort } from '@/adapters/identity/createClubIdentityAdapter'
import type { IdentityUserRecord } from '../../../packages/domain-contracts/src/identity'

export interface ClubAccountUser {
  id: string
  name: string
  email: string
  role: IdentityUserRecord['role']
  isActive: boolean
  teamId: string | null
  createdAt: Date
}

function toClubAccount(user: IdentityUserRecord): ClubAccountUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    teamId: user.teamId,
    createdAt: new Date(user.createdAt),
  }
}

/**
 * Club account orchestration. Identity owns credentials and User persistence;
 * Club keeps the business guards that scope every operation to the current
 * team and protect the club administrator account.
 */
export class UserService {
  constructor(private readonly identity: ClubIdentityPort = createClubIdentityAdapter()) {}

  async findByEmail(email: string): Promise<ClubAccountUser | null> {
    const user = await this.identity.getUserByEmail(email)
    return user ? toClubAccount(user) : null
  }

  async findAllByTeam(teamId: string): Promise<ClubAccountUser[]> {
    return (await this.identity.listUsers({ teamId })).map(toClubAccount)
  }

  async findById(id: string, teamId: string): Promise<ClubAccountUser | null> {
    const user = await this.identity.getUserById(id)
    if (!user || user.teamId !== teamId) return null
    return toClubAccount(user)
  }

  /** New club accounts remain OBSERVATEUR; only the existing ADMIN can manage them. */
  async create(
    data: { name: string; email: string; password: string; isActive?: boolean },
    teamId: string,
  ): Promise<ClubAccountUser> {
    if (await this.identity.getUserByEmail(data.email)) {
      throw new Error('Un compte existe déjà avec cet email')
    }

    try {
      return toClubAccount(
        await this.identity.createUser({
          name: data.name,
          email: data.email,
          password: data.password,
          role: 'OBSERVATEUR',
          isActive: data.isActive ?? true,
          teamId,
        }),
      )
    } catch (error) {
      if (error instanceof Error && error.message === 'email_taken') {
        throw new Error('Un compte existe déjà avec cet email')
      }
      throw error
    }
  }

  async update(
    id: string,
    teamId: string,
    data: { name?: string; email?: string; password?: string; isActive?: boolean },
  ): Promise<ClubAccountUser> {
    const user = await this.findById(id, teamId)
    if (!user) throw new Error('Compte non trouvé')
    if (user.role === 'ADMIN' && data.isActive === false) {
      throw new Error('Impossible de désactiver le compte administrateur du club')
    }

    if (data.email && data.email !== user.email) {
      const existing = await this.identity.getUserByEmail(data.email)
      if (existing && existing.id !== id) {
        throw new Error('Un compte existe déjà avec cet email')
      }
    }

    try {
      return toClubAccount(
        await this.identity.updateUser(id, {
          name: data.name,
          email: data.email,
          password: data.password,
          isActive: data.isActive,
        }),
      )
    } catch (error) {
      if (error instanceof Error && error.message === 'email_taken') {
        throw new Error('Un compte existe déjà avec cet email')
      }
      if (error instanceof Error && error.message === 'not_found') {
        throw new Error('Compte non trouvé')
      }
      throw error
    }
  }

  async delete(id: string, teamId: string): Promise<boolean> {
    const user = await this.findById(id, teamId)
    if (!user) throw new Error('Compte non trouvé')
    if (user.role === 'ADMIN') {
      throw new Error('Impossible de supprimer le compte administrateur du club')
    }

    try {
      await this.identity.deleteUser(id)
      return true
    } catch (error) {
      if (error instanceof Error && error.message === 'not_found') {
        throw new Error('Compte non trouvé')
      }
      throw error
    }
  }
}
