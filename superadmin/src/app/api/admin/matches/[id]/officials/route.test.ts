import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { seedBaseGraph } from '@/test/fixtures'
import { Saison } from '@/lib/entities'
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

const mockAssignMatchOfficial = vi.fn()
vi.mock('@/lib/matchOfficialClient', () => ({
  assignMatchOfficial: (...args: unknown[]) => mockAssignMatchOfficial(...args),
  listMatchOfficials: vi.fn(),
  MatchOfficialClientError: class MatchOfficialClientError extends Error {},
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

function postRequest(matchId: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/admin/matches/${matchId}/officials`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(async () => {
  dataSource = await createTestDataSource()
  mockGetSsoSessionFromRequest.mockReset()
  mockAssignMatchOfficial.mockReset()
})

afterEach(async () => {
  await dataSource.destroy()
})

describe('POST /api/admin/matches/:id/officials — autorisation dérivée de la fédération du match (migration.md §9/§11)', () => {
  it('rejects a FEDERATION_ADMIN whose federation does not govern this match', async () => {
    const { match } = await seedBaseGraph(dataSource)
    mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'FEDERATION_ADMIN', federationId: 'fed-other' }))

    const response = await POST(postRequest(match.id, { user_id: 'referee-1', role: 'CENTER_REFEREE' }), {
      params: Promise.resolve({ id: match.id }),
    })

    expect(response.status).toBe(403)
    expect(mockAssignMatchOfficial).not.toHaveBeenCalled()
  })

  it('allows the FEDERATION_ADMIN that governs this match', async () => {
    const { match, federation } = await seedBaseGraph(dataSource)
    mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'FEDERATION_ADMIN', federationId: federation.id }))
    mockAssignMatchOfficial.mockResolvedValue({ id: 1, matchId: match.id, userId: 'referee-1', role: 'CENTER_REFEREE', status: 'ACTIVE' })

    const response = await POST(postRequest(match.id, { user_id: 'referee-1', role: 'CENTER_REFEREE' }), {
      params: Promise.resolve({ id: match.id }),
    })

    expect(response.status).toBe(201)
    expect(mockAssignMatchOfficial).toHaveBeenCalledWith(match.id, {
      userId: 'referee-1',
      role: 'CENTER_REFEREE',
      refereeId: null,
      assignedBy: 'admin@example.com',
    })
  })

  it('rejects a FEDERATION_ADMIN when the match has no resolvable federation (reserved to PLATFORM_SUPERADMIN)', async () => {
    const { match, saison } = await seedBaseGraph(dataSource)
    await dataSource.getRepository(Saison).update(saison.id, { league_id: null })
    mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'FEDERATION_ADMIN', federationId: 'fed-a' }))

    const response = await POST(postRequest(match.id, { user_id: 'referee-1', role: 'CENTER_REFEREE' }), {
      params: Promise.resolve({ id: match.id }),
    })

    expect(response.status).toBe(403)
  })

  it('allows PLATFORM_SUPERADMIN even when the match has no resolvable federation', async () => {
    const { match, saison } = await seedBaseGraph(dataSource)
    await dataSource.getRepository(Saison).update(saison.id, { league_id: null })
    mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'PLATFORM_SUPERADMIN' }))
    mockAssignMatchOfficial.mockResolvedValue({ id: 2, matchId: match.id, userId: 'referee-1', role: 'CENTER_REFEREE', status: 'ACTIVE' })

    const response = await POST(postRequest(match.id, { user_id: 'referee-1', role: 'CENTER_REFEREE' }), {
      params: Promise.resolve({ id: match.id }),
    })

    expect(response.status).toBe(201)
  })
})
