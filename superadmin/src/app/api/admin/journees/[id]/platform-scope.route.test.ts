import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { SsoUser } from '@/lib/ssoSession'

const mockSession = vi.fn<() => Promise<SsoUser | null>>()
const mockGetJourneeScope = vi.fn()
const mockGetSaisonScope = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/ssoSession', () => ({
  getSsoSession: vi.fn(),
  getSsoSessionFromRequest: () => mockSession(),
  redirectToLogin: vi.fn(),
}))
vi.mock('@/lib/db', () => ({ getDataSource: async () => ({}) }))
vi.mock('@/lib/matchFederationScope', () => ({
  getJourneeScope: (...args: unknown[]) => mockGetJourneeScope(...args),
  getSaisonScope: (...args: unknown[]) => mockGetSaisonScope(...args),
}))
vi.mock('@/lib/adminJournees', () => ({
  updateJourneeAdmin: (...args: unknown[]) => mockUpdate(...args),
  deleteJourneeAdmin: (...args: unknown[]) => mockDelete(...args),
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
  mockGetJourneeScope.mockReset()
  mockGetSaisonScope.mockReset()
  mockUpdate.mockReset()
  mockDelete.mockReset()
  mockSession.mockResolvedValue(platformAdmin)
  mockGetJourneeScope.mockResolvedValue(null)
})

describe('matchday mutations without a league scope', () => {
  it('allows PLATFORM_SUPERADMIN to update a matchday from a season without a league', async () => {
    mockUpdate.mockResolvedValue({ id: 'day-1' })
    const request = new NextRequest('http://localhost/api/admin/journees/day-1', {
      method: 'PATCH',
      body: JSON.stringify({ nom_fr: 'Finale' }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'day-1' }) })

    expect(response.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith('day-1', { nom_fr: 'Finale' }, null)
  })

  it('allows PLATFORM_SUPERADMIN to delete a matchday from a season without a league', async () => {
    mockDelete.mockResolvedValue({ success: true })

    const response = await DELETE(new NextRequest('http://localhost/api/admin/journees/day-1'), {
      params: Promise.resolve({ id: 'day-1' }),
    })

    expect(response.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith('day-1', null)
  })
})
