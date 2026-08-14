import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { SsoUser } from '@/lib/ssoSession'

const mockSession = vi.fn<() => Promise<SsoUser | null>>()
const mockGetMatchScope = vi.fn()
const mockGetJourneeScope = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/ssoSession', () => ({
  getSsoSession: vi.fn(),
  getSsoSessionFromRequest: () => mockSession(),
  redirectToLogin: vi.fn(),
}))
vi.mock('@/lib/db', () => ({ getDataSource: async () => ({}) }))
vi.mock('@/lib/matchFederationScope', () => ({
  getMatchScope: (...args: unknown[]) => mockGetMatchScope(...args),
  getJourneeScope: (...args: unknown[]) => mockGetJourneeScope(...args),
}))
vi.mock('@/lib/adminMatches', () => ({
  updateMatchAdmin: (...args: unknown[]) => mockUpdate(...args),
  deleteMatchAdmin: (...args: unknown[]) => mockDelete(...args),
}))
vi.mock('@/lib/auditLog', () => ({ logAdminAction: vi.fn() }))

const { PATCH, DELETE } = await import('./route')

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
  mockGetJourneeScope.mockReset()
  mockUpdate.mockReset()
  mockDelete.mockReset()
  mockSession.mockResolvedValue(platformAdmin)
  mockGetMatchScope.mockResolvedValue(null)
})

describe('match mutations without a league scope', () => {
  it('allows PLATFORM_SUPERADMIN to update a match from a season without a league', async () => {
    mockUpdate.mockResolvedValue({ match: { id: 'match-1' }, overriddenConflicts: [] })
    const request = new NextRequest('http://localhost/api/admin/matches/match-1', {
      method: 'PATCH',
      body: JSON.stringify({ score_home: 1 }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'match-1' }) })

    expect(response.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith('match-1', { score_home: 1 }, null)
  })

  it('allows PLATFORM_SUPERADMIN to delete a match from a season without a league', async () => {
    mockDelete.mockResolvedValue({ success: true })

    const response = await DELETE(new NextRequest('http://localhost/api/admin/matches/match-1'), {
      params: Promise.resolve({ id: 'match-1' }),
    })

    expect(response.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith('match-1', null)
  })
})
