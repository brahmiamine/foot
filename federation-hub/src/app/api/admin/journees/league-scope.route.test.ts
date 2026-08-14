import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { SsoUser } from '@/lib/ssoSession'

const mockSession = vi.fn<() => Promise<SsoUser | null>>()
const mockGetSaisonScope = vi.fn()
const mockList = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/lib/ssoSession', () => ({
  getSsoSession: vi.fn(),
  getSsoSessionFromRequest: () => mockSession(),
  redirectToLogin: vi.fn(),
}))
vi.mock('@/lib/db', () => ({ getDataSource: async () => ({}) }))
vi.mock('@/lib/matchFederationScope', () => ({
  getSaisonScope: (...args: unknown[]) => mockGetSaisonScope(...args),
}))
vi.mock('@/lib/adminJournees', () => ({
  listJourneesForAdmin: (...args: unknown[]) => mockList(...args),
  createJourneeAdmin: (...args: unknown[]) => mockCreate(...args),
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
  mockGetSaisonScope.mockReset()
  mockList.mockReset()
  mockCreate.mockReset()
  mockSession.mockResolvedValue(leagueAdmin)
})

describe('admin matchdays LEAGUE_ADMIN isolation', () => {
  it('lists only matchdays from the caller league', async () => {
    mockList.mockResolvedValue([])
    const response = await GET(new NextRequest('http://localhost/api/admin/journees'))
    expect(response.status).toBe(200)
    expect(mockList).toHaveBeenCalledWith('league-a')
  })

  it('rejects creating a matchday for a season from another league', async () => {
    mockGetSaisonScope.mockResolvedValue({ leagueId: 'league-b', federationId: 'fed-a' })
    const request = new NextRequest('http://localhost/api/admin/journees', {
      method: 'POST',
      body: JSON.stringify({ saison_id: 'season-b', numero: 1 }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
