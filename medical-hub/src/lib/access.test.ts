import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.fn()
const getEffectiveAccess = vi.fn()

vi.mock('./auth', () => ({ auth: (...args: unknown[]) => auth(...args) }))
vi.mock('@/adapters/club/createClubRbacAdapter', () => ({
  createClubRbacAdapter: () => ({ getEffectiveAccess }),
}))

beforeEach(() => {
  auth.mockReset()
  getEffectiveAccess.mockReset()
})

describe('getUserAccess', () => {
  it('keeps ADMIN as full-access without calling the Club RBAC service', async () => {
    auth.mockResolvedValue({
      user: { id: 'admin-1', teamId: 'team-1', role: 'ADMIN' },
    })
    const { getUserAccess } = await import('./access')

    const access = await getUserAccess()

    expect(access).toMatchObject({
      userId: 'admin-1',
      teamId: 'team-1',
      isClubAdmin: true,
      permissions: 'ALL',
      categories: 'ALL',
    })
    expect(getEffectiveAccess).not.toHaveBeenCalled()
  })

  it('uses Club effective permissions for a non-admin account', async () => {
    auth.mockResolvedValue({
      user: { id: 'medical-1', teamId: 'team-1', role: 'OBSERVATEUR' },
    })
    getEffectiveAccess.mockResolvedValue({
      permissions: ['medical.view', 'medical.manage'],
      categories: ['U19'],
    })
    const { getUserAccess } = await import('./access')

    const access = await getUserAccess()

    expect(getEffectiveAccess).toHaveBeenCalledWith({ teamId: 'team-1', userId: 'medical-1' })
    expect(access.isClubAdmin).toBe(false)
    expect(access.permissions).toEqual(new Set(['medical.view', 'medical.manage']))
    expect(access.categories).toEqual(['U19'])
  })
})
