import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createHash } from 'node:crypto'
import { createTestDataSource } from '@/test/testDataSource'
import { StaffInvitation, Team } from '@/lib/entities'

let dataSource: DataSource

vi.mock('@/lib/db', () => ({
  getDataSource: async () => dataSource,
}))

const sendEmail = vi.fn()
vi.mock('./mailer', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}))

const createIdentityUser = vi.fn()
vi.mock('./identityClient', () => ({
  createIdentityUser: (...args: unknown[]) => createIdentityUser(...args),
}))

beforeEach(async () => {
  dataSource = await createTestDataSource()
  sendEmail.mockReset()
  createIdentityUser.mockReset()
})

afterEach(async () => {
  await dataSource.destroy()
})

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

async function seedTeam(): Promise<Team> {
  const repo = dataSource.getRepository(Team)
  return repo.save(repo.create({ nom: 'Club Test', team_type: 'club' }))
}

async function seedInvitation(rawToken: string, overrides: Partial<StaffInvitation> = {}): Promise<StaffInvitation> {
  const team = await seedTeam()
  const repo = dataSource.getRepository(StaffInvitation)
  return repo.save(
    repo.create({
      teamId: team.id,
      name: 'Amine',
      email: 'amine@example.com',
      role: 'ADMIN',
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      ...overrides,
    }),
  )
}

/** TS-53 (Epic E17) — acceptInvitation délègue la création du compte à sso. */
describe('acceptInvitation', () => {
  it('creates the account via sso (identityClient), never writes User directly', async () => {
    const { acceptInvitation } = await import('./staffInvitations')
    const invitation = await seedInvitation('raw-token-1')
    createIdentityUser.mockResolvedValue({
      ok: true,
      user: {
        id: 'user-1',
        name: 'Amine',
        email: 'amine@example.com',
        role: 'ADMIN',
        isActive: true,
        teamId: invitation.teamId,
        createdAt: new Date().toISOString(),
      },
    })

    const result = await acceptInvitation('raw-token-1', 'new-password!')

    expect(result.ok).toBe(true)
    expect(createIdentityUser).toHaveBeenCalledWith({
      name: 'Amine',
      email: 'amine@example.com',
      password: 'new-password!',
      role: 'ADMIN',
      teamId: invitation.teamId,
    })
  })

  it('marks the invitation as accepted on success', async () => {
    const { acceptInvitation } = await import('./staffInvitations')
    const invitation = await seedInvitation('raw-token-1')
    createIdentityUser.mockResolvedValue({
      ok: true,
      user: {
        id: 'user-1',
        name: 'Amine',
        email: 'amine@example.com',
        role: 'ADMIN',
        isActive: true,
        teamId: invitation.teamId,
        createdAt: new Date().toISOString(),
      },
    })

    await acceptInvitation('raw-token-1', 'new-password!')

    const reloaded = await dataSource.getRepository(StaffInvitation).findOne({ where: { id: invitation.id } })
    expect(reloaded?.acceptedAt).toBeInstanceOf(Date)
  })

  it('rejects an unknown token without calling sso', async () => {
    const { acceptInvitation } = await import('./staffInvitations')

    const result = await acceptInvitation('does-not-exist', 'x')

    expect(result).toEqual({ ok: false, error: 'invalid_or_expired_token' })
    expect(createIdentityUser).not.toHaveBeenCalled()
  })

  it('rejects an expired invitation', async () => {
    const { acceptInvitation } = await import('./staffInvitations')
    await seedInvitation('raw-token-1', { expiresAt: new Date(Date.now() - 1000) })

    const result = await acceptInvitation('raw-token-1', 'x')

    expect(result).toEqual({ ok: false, error: 'invalid_or_expired_token' })
    expect(createIdentityUser).not.toHaveBeenCalled()
  })

  it('rejects an already-accepted invitation', async () => {
    const { acceptInvitation } = await import('./staffInvitations')
    await seedInvitation('raw-token-1', { acceptedAt: new Date() })

    const result = await acceptInvitation('raw-token-1', 'x')

    expect(result).toEqual({ ok: false, error: 'invalid_or_expired_token' })
  })

  it('propagates email_taken from sso without touching the invitation', async () => {
    const { acceptInvitation } = await import('./staffInvitations')
    const invitation = await seedInvitation('raw-token-1')
    createIdentityUser.mockResolvedValue({ ok: false, error: 'email_taken' })

    const result = await acceptInvitation('raw-token-1', 'x')

    expect(result).toEqual({ ok: false, error: 'email_taken' })
    const reloaded = await dataSource.getRepository(StaffInvitation).findOne({ where: { id: invitation.id } })
    expect(reloaded?.acceptedAt).toBeNull()
  })
})
