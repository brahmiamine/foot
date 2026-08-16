import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { Federation, Team } from '@/lib/entities'
import { changeAffiliation } from '@/lib/teamAffiliations'
import type { SsoUser } from '@/lib/ssoSession'

let dataSource: DataSource

vi.mock('@/lib/db', () => ({
  getDataSource: async () => dataSource,
}))

const mockGetAdminSession = vi.fn<() => Promise<SsoUser | null>>()
vi.mock('@/lib/ssoSession', () => ({
  getSsoSession: vi.fn(),
  getSsoSessionFromRequest: () => mockGetAdminSession(),
  redirectToLogin: vi.fn(),
}))

const mockCreatePlayerTransfer = vi.fn()
const mockListPlayerTransfers = vi.fn()
vi.mock('@/lib/playerTransferClient', () => ({
  createPlayerTransfer: (...args: unknown[]) => mockCreatePlayerTransfer(...args),
  listPlayerTransfers: (...args: unknown[]) => mockListPlayerTransfers(...args),
  PlayerTransferClientError: class PlayerTransferClientError extends Error {},
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
  return new NextRequest('http://localhost/api/admin/player-transfers', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(async () => {
  dataSource = await createTestDataSource()
  mockGetAdminSession.mockReset()
  mockCreatePlayerTransfer.mockReset()
  mockListPlayerTransfers.mockReset()
})

afterEach(async () => {
  await dataSource.destroy()
})

const baseBody = {
  player_id: 'player-1',
  from_team_id: 'from-team',
  to_team_id: 'to-team',
  transfer_type: 'PERMANENT',
  effective_date: '2026-01-15',
  season_id: 'season-1',
}

describe('POST /api/admin/player-transfers — autorisation dérivée de team_affiliations (migration.md §19-21)', () => {
  it('rejects a FEDERATION_ADMIN whose federation does not own the source club', async () => {
    const federationRepo = dataSource.getRepository(Federation)
    const teamRepo = dataSource.getRepository(Team)
    const fedA = await federationRepo.save(federationRepo.create({ code: 'FA', nom: 'Fédération A', is_active: true }))
    const fromTeam = await teamRepo.save(teamRepo.create({ nom: 'Club source', team_type: 'club' }))
    await changeAffiliation(dataSource, { teamId: fromTeam.id, federationId: fedA.id, startDate: '2025-01-01' })

    mockGetAdminSession.mockResolvedValue(session({ role: 'FEDERATION_ADMIN', federationId: 'fed-other' }))

    const response = await POST(postRequest({ ...baseBody, from_team_id: fromTeam.id }))

    expect(response.status).toBe(403)
    expect(mockCreatePlayerTransfer).not.toHaveBeenCalled()
  })

  it('creates a PENDING request for the owning FEDERATION_ADMIN without bypassing destination approval', async () => {
    const federationRepo = dataSource.getRepository(Federation)
    const teamRepo = dataSource.getRepository(Team)
    const fedA = await federationRepo.save(federationRepo.create({ code: 'FA', nom: 'Fédération A', is_active: true }))
    const fromTeam = await teamRepo.save(teamRepo.create({ nom: 'Club source', team_type: 'club' }))
    await changeAffiliation(dataSource, { teamId: fromTeam.id, federationId: fedA.id, startDate: '2025-01-01' })

    mockGetAdminSession.mockResolvedValue(session({ role: 'FEDERATION_ADMIN', federationId: fedA.id }))
    mockCreatePlayerTransfer.mockResolvedValue({ id: 'transfer-1', status: 'PENDING' })

    const response = await POST(postRequest({ ...baseBody, from_team_id: fromTeam.id }))
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.status).toBe('PENDING')
    expect(mockCreatePlayerTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: 'player-1',
        fromTeamId: fromTeam.id,
        toTeamId: 'to-team',
        seasonId: 'season-1',
        createdBy: 'admin@example.com',
      }),
    )
  })

  it('rejects a FEDERATION_ADMIN when the source club has no active affiliation (unknown federation)', async () => {
    const teamRepo = dataSource.getRepository(Team)
    const fromTeam = await teamRepo.save(teamRepo.create({ nom: 'Club orphelin', team_type: 'club' }))

    mockGetAdminSession.mockResolvedValue(session({ role: 'FEDERATION_ADMIN', federationId: 'fed-a' }))

    const response = await POST(postRequest({ ...baseBody, from_team_id: fromTeam.id }))

    expect(response.status).toBe(403)
    expect(mockCreatePlayerTransfer).not.toHaveBeenCalled()
  })

  it('allows PLATFORM_SUPERADMIN even without a known active affiliation and keeps the request PENDING', async () => {
    const teamRepo = dataSource.getRepository(Team)
    const fromTeam = await teamRepo.save(teamRepo.create({ nom: 'Club orphelin', team_type: 'club' }))

    mockGetAdminSession.mockResolvedValue(session({ role: 'PLATFORM_SUPERADMIN' }))
    mockCreatePlayerTransfer.mockResolvedValue({ id: 'transfer-2', status: 'PENDING' })

    const response = await POST(postRequest({ ...baseBody, from_team_id: fromTeam.id }))
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.status).toBe('PENDING')
  })

  it('returns 400 when season_id is missing because transfer-window validation requires a season', async () => {
    mockGetAdminSession.mockResolvedValue(session({ role: 'PLATFORM_SUPERADMIN' }))
    const { season_id: _seasonId, ...withoutSeason } = baseBody

    const response = await POST(postRequest(withoutSeason))

    expect(response.status).toBe(400)
    expect(mockGetAdminSession).not.toHaveBeenCalled()
    expect(mockCreatePlayerTransfer).not.toHaveBeenCalled()
  })

  it('returns 400 when required fields are missing', async () => {
    mockGetAdminSession.mockResolvedValue(session({ role: 'PLATFORM_SUPERADMIN' }))

    const response = await POST(postRequest({ player_id: 'player-1' }))

    expect(response.status).toBe(400)
    expect(mockGetAdminSession).not.toHaveBeenCalled()
  })
})
