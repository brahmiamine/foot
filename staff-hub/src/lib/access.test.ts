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
      user: { id: 'staff-1', teamId: 'team-1', role: 'OBSERVATEUR' },
    })
    getEffectiveAccess.mockResolvedValue({
      permissions: ['staff.view', 'training.manage'],
      categories: ['U17', 'U19'],
    })
    const { getUserAccess } = await import('./access')

    const access = await getUserAccess()

    expect(getEffectiveAccess).toHaveBeenCalledWith({ teamId: 'team-1', userId: 'staff-1' })
    expect(access.isClubAdmin).toBe(false)
    expect(access.permissions).toEqual(new Set(['staff.view', 'training.manage']))
    expect(access.categories).toEqual(['U17', 'U19'])
  })
})
