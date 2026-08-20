import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
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

function parseInstant(value: string | null | undefined): Date | null {
  if (value === undefined || value === null) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error('invalid_access_window')
  return parsed
}

function validWindow(from: Date | null, until: Date | null): boolean {
  return !(from && until && from.getTime() >= until.getTime())
}

function sameInstant(left: Date | null | undefined, right: Date | null | undefined): boolean {
  if (!left && !right) return true
  if (!left || !right) return false
  return left.getTime() === right.getTime()
}

function toRecord(user: User): IdentityUserRecord {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: Boolean(user.isActive),
    accessValidFrom: user.accessValidFrom?.toISOString() ?? null,
    accessValidUntil: user.accessValidUntil?.toISOString() ?? null,
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
    const query = repository.createQueryBuilder('user')

    if (search.teamId) query.andWhere('user.teamId = :teamId', { teamId: search.teamId })
    if (search.roles?.length) query.andWhere('user.role IN (:...roles)', { roles: search.roles })
    if (search.hasTeam === true) query.andWhere('user.teamId IS NOT NULL')
    if (search.hasTeam === false) query.andWhere('user.teamId IS NULL')

    return (await query.orderBy('user.name', 'ASC').getMany()).map(toRecord)
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

    const accessValidFrom = parseInstant(input.accessValidFrom)
    const accessValidUntil = parseInstant(input.accessValidUntil)
    if (!validWindow(accessValidFrom, accessValidUntil)) throw new Error('invalid_access_window')

    const user = repository.create({
      id: randomUUID(),
      name: input.name,
      email: input.email,
      password: await bcrypt.hash(input.password, 12),
      role: input.role as User['role'],
      isActive: input.isActive ?? true,
      accessValidFrom,
      accessValidUntil,
      tokenVersion: 0,
      teamId: input.teamId ?? null,
    })
    return toRecord(await repository.save(user))
  }

  async updateUser(id: string, input: UpdateIdentityAccountInput): Promise<IdentityUserRecord> {
    const repository = await this.repository()
    const user = await repository.findOne({ where: { id } })
    if (!user) throw new Error('not_found')

    const nextAccessValidFrom =
      input.accessValidFrom !== undefined ? parseInstant(input.accessValidFrom) : (user.accessValidFrom ?? null)
    const nextAccessValidUntil =
      input.accessValidUntil !== undefined ? parseInstant(input.accessValidUntil) : (user.accessValidUntil ?? null)
    if (!validWindow(nextAccessValidFrom, nextAccessValidUntil)) throw new Error('invalid_access_window')

    if (input.email !== undefined && input.email !== user.email) {
      const existing = await repository.findOne({ where: { email: input.email } })
      if (existing && existing.id !== id) throw new Error('email_taken')
      user.email = input.email
    }
    if (input.name !== undefined) user.name = input.name

    let bumpTokenVersion = false
    if (input.isActive !== undefined && Boolean(input.isActive) !== Boolean(user.isActive)) {
      user.isActive = input.isActive
      bumpTokenVersion = true
    }
    if (input.role !== undefined) user.role = input.role as User['role']
    if (input.password) {
      user.password = await bcrypt.hash(input.password, 12)
      bumpTokenVersion = true
    }
    if (input.accessValidFrom !== undefined && !sameInstant(user.accessValidFrom, nextAccessValidFrom)) {
      user.accessValidFrom = nextAccessValidFrom
      bumpTokenVersion = true
    }
    if (input.accessValidUntil !== undefined && !sameInstant(user.accessValidUntil, nextAccessValidUntil)) {
      user.accessValidUntil = nextAccessValidUntil
      bumpTokenVersion = true
    }
    if (bumpTokenVersion) user.tokenVersion += 1

    return toRecord(await repository.save(user))
  }

  async deleteUser(id: string): Promise<void> {
    const repository = await this.repository()
    const user = await repository.findOne({ where: { id } })
    if (!user) throw new Error('not_found')
    await repository.remove(user)
  }
}