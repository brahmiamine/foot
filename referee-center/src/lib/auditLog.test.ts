import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { NextRequest } from 'next/server'
import { createTestDataSource } from '@/test/testDataSource'
import { AuditLog } from '@/lib/entities'

let dataSource: DataSource

vi.mock('@/lib/db', () => ({
  getDataSource: async () => dataSource,
}))

const mockGetSsoSessionFromRequest = vi.fn()
vi.mock('@/lib/ssoSession', () => ({
  getSsoSessionFromRequest: (...args: unknown[]) => mockGetSsoSessionFromRequest(...args),
}))

beforeEach(async () => {
  dataSource = await createTestDataSource()
  mockGetSsoSessionFromRequest.mockReset()
})

afterEach(async () => {
  await dataSource.destroy()
})

function buildRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/admin/alerts/alert-1/resolve', { headers })
}

/**
 * `admin_username` était alimenté depuis un cookie/header Basic legacy
 * (ADMIN_USER/ADMIN_PASS) resté après la migration vers une vraie session
 * SSO — plus jamais présent en pratique, donc `admin_username` restait null
 * pour toute action journalisée. Voir US-40 (avancement.md).
 */
describe('logAdminAction — attribution de admin_username', () => {
  it('utilise l\'email de la session SSO en priorité', async () => {
    mockGetSsoSessionFromRequest.mockResolvedValue({
      id: 'user-1',
      email: 'admin@club.tn',
      name: 'Admin',
      role: 'SUPERADMIN',
      teamId: null,
    })
    const { logAdminAction } = await import('./auditLog')

    await logAdminAction({
      request: buildRequest(),
      action: 'update',
      entityType: 'alert',
      entityId: 'alert-1',
      summary: 'test',
    })

    const entry = await dataSource.getRepository(AuditLog).findOne({ where: { entity_id: 'alert-1' } })
    expect(entry?.admin_username).toBe('admin@club.tn')
  })

  it('retombe sur le cookie/header legacy quand il n\'y a pas de session SSO', async () => {
    mockGetSsoSessionFromRequest.mockResolvedValue(null)
    const { logAdminAction } = await import('./auditLog')

    const token = Buffer.from('legacyadmin:secret').toString('base64')
    await logAdminAction({
      request: buildRequest({ authorization: `Basic ${token}` }),
      action: 'update',
      entityType: 'alert',
      entityId: 'alert-1',
    })

    const entry = await dataSource.getRepository(AuditLog).findOne({ where: { entity_id: 'alert-1' } })
    expect(entry?.admin_username).toBe('legacyadmin')
  })

  it('laisse admin_username null sans session SSO ni credentials legacy', async () => {
    mockGetSsoSessionFromRequest.mockResolvedValue(null)
    const { logAdminAction } = await import('./auditLog')

    await logAdminAction({
      request: buildRequest(),
      action: 'update',
      entityType: 'alert',
      entityId: 'alert-1',
    })

    const entry = await dataSource.getRepository(AuditLog).findOne({ where: { entity_id: 'alert-1' } })
    expect(entry?.admin_username).toBeNull()
  })

  it('n\'échoue jamais l\'action appelante même si l\'écriture du journal échoue', async () => {
    mockGetSsoSessionFromRequest.mockRejectedValue(new Error('boom'))
    const { logAdminAction } = await import('./auditLog')

    await expect(
      logAdminAction({ request: buildRequest(), action: 'update', entityType: 'alert', entityId: 'alert-1' })
    ).resolves.toBeUndefined()
  })
})
