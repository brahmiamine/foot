import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { SsoUser } from '@/lib/ssoSession'

const mockSession = vi.fn<() => Promise<SsoUser | null>>()
const mockGetTransfer = vi.fn()
const mockComplete = vi.fn()
const mockGetAffiliation = vi.fn()

vi.mock('@/lib/ssoSession', () => ({
  getSsoSession: vi.fn(),
  getSsoSessionFromRequest: () => mockSession(),
  redirectToLogin: vi.fn(),
}))
vi.mock('@/lib/db', () => ({ getDataSource: async () => ({}) }))
vi.mock('@/lib/teamAffiliations', () => ({
  getActiveAffiliation: (...args: unknown[]) => mockGetAffiliation(...args),
}))
vi.mock('@/lib/playerTransferClient', () => ({
  getPlayerTransfer: (...args: unknown[]) => mockGetTransfer(...args),
  completePlayerTransfer: (...args: unknown[]) => mockComplete(...args),
  PlayerTransferClientError: class PlayerTransferClientError extends Error {},
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
  mockGetTransfer.mockReset()
  mockComplete.mockReset()
  mockGetAffiliation.mockReset()
  mockSession.mockResolvedValue(platformAdmin)
})

it('loads the transfer directly by id before homologation', async () => {
  mockGetTransfer.mockResolvedValue({
    id: 'transfer-older-than-page-limit',
    status: 'APPROVED',
    fromTeamId: 'team-a',
  })
  mockGetAffiliation.mockResolvedValue(null)
  mockComplete.mockResolvedValue({ id: 'transfer-older-than-page-limit', status: 'COMPLETED' })

  const response = await POST(
    new NextRequest('http://localhost/api/admin/player-transfers/transfer-older-than-page-limit/homologate', {
      method: 'POST',
    }),
    { params: Promise.resolve({ id: 'transfer-older-than-page-limit' }) },
  )

  expect(response.status).toBe(200)
  expect(mockGetTransfer).toHaveBeenCalledWith('transfer-older-than-page-limit')
  expect(mockComplete).toHaveBeenCalledWith(
    'transfer-older-than-page-limit',
    'platform@example.com',
    undefined,
  )
})
