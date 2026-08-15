import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createHash } from 'node:crypto'
import { createTestDataSource } from '@/test/testDataSource'
import { StaffInvitation, Team, Federation, League } from '@/lib/entities'

let dataSource: DataSource

vi.mock('@/lib/db', () => ({
  getDataSource: async () => dataSource,
}))

const sendEmail = vi.fn()
vi.mock('./mailer', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}))

const createIdentityUser = vi.fn()
const getIdentityUserByEmail = vi.fn()
vi.mock('./identityClient', () => ({
  createIdentityUser: (...args: unknown[]) => createIdentityUser(...args),
  getIdentityUserByEmail: (...args: unknown[]) => getIdentityUserByEmail(...args),
}))

beforeEach(async () => {
  dataSource = await createTestDataSource()
  sendEmail.mockReset()
  createIdentityUser.mockReset()
  getIdentityUserByEmail.mockReset()
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
      federationId: null,
      leagueId: null,
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

  it('propagates a real email_taken conflict (existing account belongs to someone else)', async () => {
    const { acceptInvitation } = await import('./staffInvitations')
    const invitation = await seedInvitation('raw-token-1')
    createIdentityUser.mockResolvedValue({ ok: false, error: 'email_taken' })
    getIdentityUserByEmail.mockResolvedValue({
      id: 'someone-else',
      name: 'Quelqu\'un d\'autre',
      email: 'amine@example.com',
      role: 'OBSERVATEUR',
      isActive: true,
      teamId: 'other-team',
      createdAt: new Date().toISOString(),
    })

    const result = await acceptInvitation('raw-token-1', 'x')

    expect(result).toEqual({ ok: false, error: 'email_taken' })
    const reloaded = await dataSource.getRepository(StaffInvitation).findOne({ where: { id: invitation.id } })
    expect(reloaded?.acceptedAt).toBeNull()
  })

  it('propagates email_taken when no matching account can be found at all', async () => {
    const { acceptInvitation } = await import('./staffInvitations')
    await seedInvitation('raw-token-1')
    createIdentityUser.mockResolvedValue({ ok: false, error: 'email_taken' })
    getIdentityUserByEmail.mockResolvedValue(null)

    const result = await acceptInvitation('raw-token-1', 'x')

    expect(result).toEqual({ ok: false, error: 'email_taken' })
  })

  it('TASK-P0-013: treats email_taken as a success when the existing account matches this exact invitation (idempotent retry)', async () => {
    const { acceptInvitation } = await import('./staffInvitations')
    const invitation = await seedInvitation('raw-token-1')
    createIdentityUser.mockResolvedValue({ ok: false, error: 'email_taken' })
    getIdentityUserByEmail.mockResolvedValue({
      id: 'user-1',
      name: 'Amine',
      email: 'amine@example.com',
      role: 'ADMIN',
      isActive: true,
      teamId: invitation.teamId,
      createdAt: new Date().toISOString(),
    })

    const result = await acceptInvitation('raw-token-1', 'x')

    expect(result).toEqual({ ok: true, user: expect.objectContaining({ id: 'user-1', email: 'amine@example.com' }) })
    const reloaded = await dataSource.getRepository(StaffInvitation).findOne({ where: { id: invitation.id } })
    expect(reloaded?.acceptedAt).toBeInstanceOf(Date)
  })
})

/** migration.md §0 (provisioning) : createInvitation élargi aux rôles Fédération/Ligue/Club. */
describe('createInvitation', () => {
  it('creates a club invitation (ADMIN/OBSERVATEUR) when teamId is valid — unchanged behavior', async () => {
    const { createInvitation } = await import('./staffInvitations')
    const team = await seedTeam()

    const invitation = await createInvitation(
      { name: 'Amine', email: 'amine@example.com', role: 'ADMIN', teamId: team.id },
      'https://federation-hub.example.com',
    )

    expect(invitation.id).toBeTruthy()
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'amine@example.com', subject: expect.stringContaining(team.nom) }),
    )
    const saved = await dataSource.getRepository(StaffInvitation).findOne({ where: { id: invitation.id } })
    expect(saved?.teamId).toBe(team.id)
    expect(saved?.federationId).toBeNull()
  })

  it('rejects a club invitation for an unknown team', async () => {
    const { createInvitation } = await import('./staffInvitations')

    await expect(
      createInvitation({ name: 'Amine', email: 'amine@example.com', role: 'ADMIN', teamId: 'does-not-exist' }, 'https://x'),
    ).rejects.toThrow('Club introuvable')
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('rejects a club invitation without teamId', async () => {
    const { createInvitation } = await import('./staffInvitations')

    await expect(createInvitation({ name: 'Amine', email: 'amine@example.com', role: 'ADMIN' }, 'https://x')).rejects.toThrow(
      'teamId est requis',
    )
  })

  it('creates a FEDERATION_ADMIN invitation scoped to a real federation', async () => {
    const { createInvitation } = await import('./staffInvitations')
    const federationRepo = dataSource.getRepository(Federation)
    const federation = await federationRepo.save(federationRepo.create({ code: 'FTF', nom: 'Fédération Tunisienne', is_active: true }))

    const invitation = await createInvitation(
      { name: 'Fatma', email: 'fatma@example.com', role: 'FEDERATION_ADMIN', federationId: federation.id },
      'https://x',
    )

    const saved = await dataSource.getRepository(StaffInvitation).findOne({ where: { id: invitation.id } })
    expect(saved?.federationId).toBe(federation.id)
    expect(saved?.teamId).toBeNull()
  })

  it('rejects a FEDERATION_ADMIN invitation without federationId', async () => {
    const { createInvitation } = await import('./staffInvitations')

    await expect(
      createInvitation({ name: 'Fatma', email: 'fatma@example.com', role: 'FEDERATION_ADMIN' }, 'https://x'),
    ).rejects.toThrow('federationId est requis')
  })

  it('creates a LEAGUE_ADMIN invitation scoped to a real league', async () => {
    const { createInvitation } = await import('./staffInvitations')
    const federationRepo = dataSource.getRepository(Federation)
    const leagueRepo = dataSource.getRepository(League)
    const federation = await federationRepo.save(federationRepo.create({ code: 'FTF', nom: 'Fédération Tunisienne', is_active: true }))
    const league = await leagueRepo.save(leagueRepo.create({ federation_id: federation.id, nom: 'Ligue 1', is_active: true }))

    const invitation = await createInvitation(
      { name: 'Karim', email: 'karim@example.com', role: 'LEAGUE_ADMIN', leagueId: league.id },
      'https://x',
    )

    const saved = await dataSource.getRepository(StaffInvitation).findOne({ where: { id: invitation.id } })
    expect(saved?.leagueId).toBe(league.id)
    expect(saved?.federationId).toBeNull()
    expect(saved?.teamId).toBeNull()
  })

  it('rejects a LEAGUE_ADMIN invitation for an unknown league', async () => {
    const { createInvitation } = await import('./staffInvitations')

    await expect(
      createInvitation({ name: 'Karim', email: 'karim@example.com', role: 'LEAGUE_ADMIN', leagueId: 'does-not-exist' }, 'https://x'),
    ).rejects.toThrow('Ligue introuvable')
  })

  it.each(['REFEREE', 'MATCH_OFFICIAL', 'REFEREE_OBSERVER'] as const)(
    'creates a %s invitation without requiring any team/federation/league scope',
    async (role) => {
      const { createInvitation } = await import('./staffInvitations')

      const invitation = await createInvitation({ name: 'Sami', email: `${role}@example.com`, role }, 'https://x')

      const saved = await dataSource.getRepository(StaffInvitation).findOne({ where: { id: invitation.id } })
      expect(saved?.teamId).toBeNull()
      expect(saved?.federationId).toBeNull()
      expect(saved?.leagueId).toBeNull()
      expect(saved?.role).toBe(role)
    },
  )

  it('rejects an invitation when Identity reports an existing account for that email', async () => {
    const { createInvitation } = await import('./staffInvitations')
    getIdentityUserByEmail.mockResolvedValue({
      id: 'existing-user',
      name: 'Existant',
      email: 'taken@example.com',
      role: 'OBSERVATEUR',
      isActive: true,
      teamId: null,
      createdAt: new Date().toISOString(),
    })

    await expect(
      createInvitation({ name: 'Sami', email: 'taken@example.com', role: 'REFEREE' }, 'https://x'),
    ).rejects.toThrow('Un compte existe déjà')
    expect(getIdentityUserByEmail).toHaveBeenCalledWith('taken@example.com')
  })
})