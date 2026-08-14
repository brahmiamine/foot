import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { SsoUser } from '@/lib/ssoSession'

const mockSession = vi.fn<() => Promise<SsoUser | null>>()
const mockGetMatchScope = vi.fn()
const mockList = vi.fn()
const mockAssign = vi.fn()

vi.mock('@/lib/ssoSession', () => ({
  getSsoSession: vi.fn(),
  getSsoSessionFromRequest: () => mockSession(),
  redirectToLogin: vi.fn(),
}))
vi.mock('@/lib/db', () => ({ getDataSource: async () => ({}) }))
vi.mock('@/lib/matchFederationScope', () => ({
  getMatchScope: (...args: unknown[]) => mockGetMatchScope(...args),
}))
vi.mock('@/lib/matchOfficialClient', () => ({
  MatchOfficialClientError: class MatchOfficialClientError extends Error {},
  listMatchOfficials: (...args: unknown[]) => mockList(...args),
  assignMatchOfficial: (...args: unknown[]) => mockAssign(...args),
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
  mockGetMatchScope.mockReset()
  mockList.mockReset()
  mockAssign.mockReset()
  mockSession.mockResolvedValue(leagueAdmin)
  mockGetMatchScope.mockResolvedValue({ leagueId: 'league-b', federationId: 'fed-a' })
})

describe('match officials LEAGUE_ADMIN isolation', () => {
  it('rejects listing officials for a match from another league', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/admin/matches/match-b/officials'),
      { params: Promise.resolve({ id: 'match-b' }) },
    )
    expect(response!.status).toBe(403)
    expect(mockList).not.toHaveBeenCalled()
  })

  it('rejects assigning an official to a match from another league', async () => {
    const request = new NextRequest('http://localhost/api/admin/matches/match-b/officials', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'official-1', role: 'CENTER_REFEREE' }),
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'match-b' }) })
    expect(response!.status).toBe(403)
    expect(mockAssign).not.toHaveBeenCalled()
  })
})
