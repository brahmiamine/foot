import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { Federation, League } from '@/lib/entities'
import type { SsoUser } from '@/lib/ssoSession'

let dataSource: DataSource

vi.mock('@/lib/db', () => ({
  getDataSource: async () => dataSource,
}))

const mockGetSsoSessionFromRequest = vi.fn<() => Promise<SsoUser | null>>()
vi.mock('@/lib/ssoSession', () => ({
  getSsoSession: vi.fn(),
  getSsoSessionFromRequest: () => mockGetSsoSessionFromRequest(),
  redirectToLogin: vi.fn(),
}))

const mockCreateInvitation = vi.fn()
vi.mock('@/lib/staffInvitations', () => ({
  createInvitation: (...args: unknown[]) => mockCreateInvitation(...args),
}))

const { POST } = await import('./route')

function session(overrides: Partial<SsoUser>): SsoUser {
  return {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'FEDERATION_ADMIN',
    teamId: null,
    federationId: null,
    leagueId: null,
    ...overrides,
  }
}

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/admin/staff-invitations', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(async () => {
  dataSource = await createTestDataSource()
  mockGetSsoSessionFromRequest.mockReset()
  mockCreateInvitation.mockReset()
  mockCreateInvitation.mockResolvedValue({ id: 'invitation-1' })
})

afterEach(async () => {
  await dataSource.destroy()
})

describe('POST /api/admin/staff-invitations (migration.md §0, provisioning)', () => {
  it('rejects an unsupported role (club roles use the dedicated /club/:teamId route)', async () => {
    mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'PLATFORM_SUPERADMIN' }))

    const response = await POST(postRequest({ name: 'Amine', email: 'a@example.com', role: 'ADMIN' }))
    expect(response.status).toBe(400)
    expect(mockCreateInvitation).not.toHaveBeenCalled()
  })

  describe('FEDERATION_ADMIN', () => {
    it('rejects a FEDERATION_ADMIN session (only PLATFORM_SUPERADMIN can create a federation admin)', async () => {
      mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'FEDERATION_ADMIN', federationId: 'fed-a' }))

      const response = await POST(postRequest({ name: 'Fatma', email: 'f@example.com', role: 'FEDERATION_ADMIN', federation_id: 'fed-a' }))
      expect(response.status).toBe(403)
    })

    it('allows PLATFORM_SUPERADMIN', async () => {
      mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'PLATFORM_SUPERADMIN' }))

      const response = await POST(postRequest({ name: 'Fatma', email: 'f@example.com', role: 'FEDERATION_ADMIN', federation_id: 'fed-a' }))
      expect(response.status).toBe(201)
      expect(mockCreateInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'FEDERATION_ADMIN', federationId: 'fed-a' }),
        expect.any(String),
      )
    })
  })

  describe('LEAGUE_ADMIN', () => {
    it('rejects a FEDERATION_ADMIN whose federation does not own the target league', async () => {
      const federationRepo = dataSource.getRepository(Federation)
      const leagueRepo = dataSource.getRepository(League)
      const federation = await federationRepo.save(federationRepo.create({ code: 'FA', nom: 'Fédération A', is_active: true }))
      const league = await leagueRepo.save(leagueRepo.create({ federation_id: federation.id, nom: 'Ligue 1', is_active: true }))

      mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'FEDERATION_ADMIN', federationId: 'fed-other' }))

      const response = await POST(postRequest({ name: 'Karim', email: 'k@example.com', role: 'LEAGUE_ADMIN', league_id: league.id }))
      expect(response.status).toBe(403)
    })

    it('allows the FEDERATION_ADMIN that owns the target league', async () => {
      const federationRepo = dataSource.getRepository(Federation)
      const leagueRepo = dataSource.getRepository(League)
      const federation = await federationRepo.save(federationRepo.create({ code: 'FA', nom: 'Fédération A', is_active: true }))
      const league = await leagueRepo.save(leagueRepo.create({ federation_id: federation.id, nom: 'Ligue 1', is_active: true }))

      mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'FEDERATION_ADMIN', federationId: federation.id }))

      const response = await POST(postRequest({ name: 'Karim', email: 'k@example.com', role: 'LEAGUE_ADMIN', league_id: league.id }))
      expect(response.status).toBe(201)
    })

    it('returns 404 for an unknown league', async () => {
      mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'PLATFORM_SUPERADMIN' }))

      const response = await POST(postRequest({ name: 'Karim', email: 'k@example.com', role: 'LEAGUE_ADMIN', league_id: 'does-not-exist' }))
      expect(response.status).toBe(404)
    })
  })

  describe('REFEREE / MATCH_OFFICIAL / REFEREE_OBSERVER', () => {
    it('allows any FEDERATION_ADMIN (no federation scope required for arbitration accounts)', async () => {
      mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'FEDERATION_ADMIN', federationId: 'fed-a' }))

      const response = await POST(postRequest({ name: 'Sami', email: 's@example.com', role: 'REFEREE_OBSERVER' }))
      expect(response.status).toBe(201)
    })

    it('rejects a LEAGUE_ADMIN (arbitration is federation territory, not league)', async () => {
      mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'LEAGUE_ADMIN', leagueId: 'league-x' }))

      const response = await POST(postRequest({ name: 'Sami', email: 's@example.com', role: 'REFEREE' }))
      expect(response.status).toBe(403)
    })
  })
})
