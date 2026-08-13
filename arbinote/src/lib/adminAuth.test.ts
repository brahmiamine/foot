import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetSsoSessionFromRequest = vi.fn()
vi.mock('@/lib/ssoSession', () => ({
  getSsoSessionFromRequest: (...args: unknown[]) => mockGetSsoSessionFromRequest(...args),
  redirectToLogin: vi.fn(),
}))

beforeEach(() => {
  mockGetSsoSessionFromRequest.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function buildRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/votes')
}

/** TASK-P0-026 : contrôle d'accès admin + journalisation des refus. */
describe('ensureAdminAuth', () => {
  it('laisse passer une session SUPERADMIN', async () => {
    mockGetSsoSessionFromRequest.mockResolvedValue({
      id: 'user-1',
      email: 'admin@club.tn',
      name: 'Admin',
      role: 'SUPERADMIN',
      teamId: null,
    })
    const { ensureAdminAuth } = await import('./adminAuth')

    const result = await ensureAdminAuth(buildRequest())

    expect(result).toBeNull()
  })

  it('refuse (401) et journalise sans session', async () => {
    mockGetSsoSessionFromRequest.mockResolvedValue(null)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { ensureAdminAuth } = await import('./adminAuth')

    const result = await ensureAdminAuth(buildRequest())

    expect(result?.status).toBe(401)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const logged = JSON.parse(warnSpy.mock.calls[0][0] as string)
    expect(logged.event).toBe('admin_access_denied')
    expect(logged.reason).toBe('no_session')
  })

  it('refuse (401) et journalise le rôle pour une session non-SUPERADMIN', async () => {
    mockGetSsoSessionFromRequest.mockResolvedValue({
      id: 'user-1',
      email: 'member@club.tn',
      name: 'Membre',
      role: 'MEMBER',
      teamId: null,
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { ensureAdminAuth } = await import('./adminAuth')

    const result = await ensureAdminAuth(buildRequest())

    expect(result?.status).toBe(401)
    const logged = JSON.parse(warnSpy.mock.calls[0][0] as string)
    expect(logged.reason).toBe('role=MEMBER')
  })
})
