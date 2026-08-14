import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { SsoUser } from '@/lib/ssoSession'

const mockSession = vi.fn<() => Promise<SsoUser | null>>()
const mockGetMatchScope = vi.fn()
const mockRevoke = vi.fn()

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
  revokeMatchOfficial: (...args: unknown[]) => mockRevoke(...args),
  MatchOfficialClientError: class MatchOfficialClientError extends Error {},
}))
vi.mock('@/lib/auditLog', () => ({ logAdminAction: vi.fn() }))

const { POST } = await import('./route')

const platformAdmin: SsoUser = {
  id: 'platform-admin',
  email: 'platform@example.com',
  name: 'Platform',
  role: 'PLATFORM_SUPERADMIN',
  teamId: null,
  federationId: null,
  leagueId: null,
}

beforeEach(() => {
  mockSession.mockReset()
  mockGetMatchScope.mockReset()
  mockRevoke.mockReset()
  mockSession.mockResolvedValue(platformAdmin)
  mockGetMatchScope.mockResolvedValue(null)
})

it('allows PLATFORM_SUPERADMIN to revoke an official on a match without a league', async () => {
  mockRevoke.mockResolvedValue({ id: 7, status: 'REVOKED' })

  const response = await POST(
    new NextRequest('http://localhost/api/admin/matches/match-1/officials/7/revoke', { method: 'POST' }),
    { params: Promise.resolve({ id: 'match-1', assignmentId: '7' }) },
  )

  expect(response.status).toBe(200)
  expect(mockRevoke).toHaveBeenCalledWith('match-1', 7, 'platform@example.com')
})
