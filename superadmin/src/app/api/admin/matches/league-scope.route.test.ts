import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { SsoUser } from '@/lib/ssoSession'

const mockSession = vi.fn<() => Promise<SsoUser | null>>()
const mockGetJourneeScope = vi.fn()
const mockList = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/lib/ssoSession', () => ({
  getSsoSession: vi.fn(),
  getSsoSessionFromRequest: () => mockSession(),
  redirectToLogin: vi.fn(),
}))
vi.mock('@/lib/db', () => ({ getDataSource: async () => ({}) }))
vi.mock('@/lib/matchFederationScope', () => ({
  getJourneeScope: (...args: unknown[]) => mockGetJourneeScope(...args),
}))
vi.mock('@/lib/adminMatches', () => ({
  listMatchesForAdmin: (...args: unknown[]) => mockList(...args),
  createMatchAdmin: (...args: unknown[]) => mockCreate(...args),
}))
vi.mock('@/lib/auditLog', () => ({ logAdminAction: vi.fn() }))

const { GET, POST } = await import('./route')

const leagueAdmin: SsoUser = {
  id: 'league-admin-a',
  email: 'league-a@example.com',
  name: 'League A',
  role: 'LEAGUE_ADMIN',
  teamId: null,
  federationId: null,
  leagueId: 'league-a',
}

beforeEach(() => {
  mockSession.mockReset()
  mockGetJourneeScope.mockReset()
  mockList.mockReset()
  mockCreate.mockReset()
  mockSession.mockResolvedValue(leagueAdmin)
})

describe('admin matches LEAGUE_ADMIN isolation', () => {
  it('rejects filtering matches with a matchday from another league', async () => {
    mockGetJourneeScope.mockResolvedValue({ leagueId: 'league-b', federationId: 'fed-a' })
    const response = await GET(new NextRequest('http://localhost/api/admin/matches?journeeId=day-b'))
    expect(response.status).toBe(403)
    expect(mockList).not.toHaveBeenCalled()
  })

  it('rejects creating a match in another league', async () => {
    mockGetJourneeScope.mockResolvedValue({ leagueId: 'league-b', federationId: 'fed-a' })
    const request = new NextRequest('http://localhost/api/admin/matches', {
      method: 'POST',
      body: JSON.stringify({ journee_id: 'day-b', equipe_home: 'a', equipe_away: 'b' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('lists only the caller league when no matchday filter is supplied', async () => {
    mockList.mockResolvedValue([])
    const response = await GET(new NextRequest('http://localhost/api/admin/matches'))
    expect(response.status).toBe(200)
    expect(mockList).toHaveBeenCalledWith(50, 'league-a', null)
  })
})
