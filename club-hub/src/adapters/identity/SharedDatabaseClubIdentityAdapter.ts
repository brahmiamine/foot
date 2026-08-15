import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { In } from 'typeorm'
import { User } from '@/entities/User'
import { getDataSource } from '@/lib/database'
import type {
  CreateIdentityAccountInput,
  IdentityAccountProvisioningPort,
  IdentityDirectoryPort,
  IdentityUserRecord,
  IdentityUserSearch,
  UpdateIdentityAccountInput,
} from '../../../../packages/domain-contracts/src/identity'

function toRecord(user: User): IdentityUserRecord {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: Boolean(user.isActive),
    teamId: user.teamId ?? null,
    createdAt: user.createdAt.toISOString(),
  }
}

/** Transitional adapter while Club and Identity still share MariaDB. */
export class SharedDatabaseClubIdentityAdapter
  implements IdentityDirectoryPort, IdentityAccountProvisioningPort
{
  private async repository() {
    return (await getDataSource()).getRepository(User)
  }

  async listUsers(search: IdentityUserSearch = {}): Promise<IdentityUserRecord[]> {
    const repository = await this.repository()
    const where: Record<string, unknown> = {}
    if (search.teamId) where.teamId = search.teamId
    if (search.roles?.length) where.role = In(search.roles)

    const users = await repository.find({ where, order: { name: 'ASC' } })
    return users
      .filter((user) => {
        if (search.hasTeam === true) return Boolean(user.teamId)
        if (search.hasTeam === false) return !user.teamId
        return true
      })
      .map(toRecord)
  }

  async getUserById(id: string): Promise<IdentityUserRecord | null> {
    const user = await (await this.repository()).findOne({ where: { id } })
    return user ? toRecord(user) : null
  }

  async getUserByEmail(email: string): Promise<IdentityUserRecord | null> {
    const user = await (await this.repository()).findOne({ where: { email } })
    return user ? toRecord(user) : null
  }

  async createUser(input: CreateIdentityAccountInput): Promise<IdentityUserRecord> {
    const repository = await this.repository()
    if (await repository.findOne({ where: { email: input.email } })) {
      throw new Error('email_taken')
    }

    const user = repository.create({
      id: randomUUID(),
      name: input.name,
      email: input.email,
      password: await bcrypt.hash(input.password, 12),
      role: input.role as User['role'],
      isActive: input.isActive ?? true,
      teamId: input.teamId ?? null,
    })
    return toRecord(await repository.save(user))
  }

  async updateUser(id: string, input: UpdateIdentityAccountInput): Promise<IdentityUserRecord> {
    const repository = await this.repository()
    const user = await repository.findOne({ where: { id } })
    if (!user) throw new Error('not_found')

    if (input.email !== undefined && input.email !== user.email) {
      const existing = await repository.findOne({ where: { email: input.email } })
      if (existing && existing.id !== id) throw new Error('email_taken')
      user.email = input.email
    }
    if (input.name !== undefined) user.name = input.name
    if (input.isActive !== undefined) user.isActive = input.isActive
    if (input.role !== undefined) user.role = input.role as User['role']
    if (input.password) user.password = await bcrypt.hash(input.password, 12)

    return toRecord(await repository.save(user))
  }

  async deleteUser(id: string): Promise<void> {
    const repository = await this.repository()
    const user = await repository.findOne({ where: { id } })
    if (!user) throw new Error('not_found')
    await repository.remove(user)
  }
}
