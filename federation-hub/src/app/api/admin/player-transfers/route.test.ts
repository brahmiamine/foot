import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { Federation, League, Team } from '@/lib/entities'
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

const { GET, POST } = await import('./route')

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

function getRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/player-transfers')
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

async function seedLeagueClub(label: string) {
  const federationRepo = dataSource.getRepository(Federation)
  const leagueRepo = dataSource.getRepository(League)
  const teamRepo = dataSource.getRepository(Team)

  const federation = await federationRepo.save(
    federationRepo.create({ code: `F${label}`, nom: `Fédération ${label}`, is_active: true }),
  )
  const league = await leagueRepo.save(
    leagueRepo.create({ federation_id: federation.id, nom: `Ligue ${label}`, is_active: true }),
  )
  const team = await teamRepo.save(teamRepo.create({ nom: `Club ${label}`, team_type: 'club' }))
  await changeAffiliation(dataSource, {
    teamId: team.id,
    federationId: federation.id,
    leagueId: league.id,
    startDate: '2025-01-01',
  })

  return { federation, league, team }
}

describe('GET /api/admin/player-transfers — scoping fédération/ligue', () => {
  it('filters a LEAGUE_ADMIN to transfers involving clubs affiliated with its league', async () => {
    const leagueA = await seedLeagueClub('A')
    const leagueB = await seedLeagueClub('B')

    mockGetAdminSession.mockResolvedValue(
      session({
        role: 'LEAGUE_ADMIN',
        federationId: leagueA.federation.id,
        leagueId: leagueA.league.id,
      }),
    )
    mockListPlayerTransfers.mockResolvedValue([
      {
        id: 'transfer-a',
        playerId: 'player-a',
        fromTeamId: leagueA.team.id,
        toTeamId: 'outside-a',
        transferType: 'PERMANENT',
        status: 'APPROVED',
        effectiveDate: '2026-01-15',
      },
      {
        id: 'transfer-b',
        playerId: 'player-b',
        fromTeamId: leagueB.team.id,
        toTeamId: 'outside-b',
        transferType: 'PERMANENT',
        status: 'APPROVED',
        effectiveDate: '2026-01-15',
      },
    ])

    const response = await GET(getRequest())
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toHaveLength(1)
    expect(json[0].id).toBe('transfer-a')
  })

  it('fails closed when a FEDERATION_ADMIN has no federation scope', async () => {
    mockGetAdminSession.mockResolvedValue(session({ role: 'FEDERATION_ADMIN', federationId: null }))
    mockListPlayerTransfers.mockResolvedValue([
      {
        id: 'transfer-hidden',
        playerId: 'player-hidden',
        fromTeamId: 'team-a',
        toTeamId: 'team-b',
        transferType: 'PERMANENT',
        status: 'PENDING',
        effectiveDate: '2026-01-15',
      },
    ])

    const response = await GET(getRequest())
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual([])
  })
})

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

  it('allows a LEAGUE_ADMIN for a source club affiliated with its league', async () => {
    const scoped = await seedLeagueClub('C')

    mockGetAdminSession.mockResolvedValue(
      session({
        role: 'LEAGUE_ADMIN',
        federationId: scoped.federation.id,
        leagueId: scoped.league.id,
      }),
    )
    mockCreatePlayerTransfer.mockResolvedValue({ id: 'transfer-league', status: 'PENDING' })

    const response = await POST(postRequest({ ...baseBody, from_team_id: scoped.team.id }))
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.status).toBe('PENDING')
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
    const withoutSeason: Record<string, unknown> = { ...baseBody }
    delete withoutSeason.season_id

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
