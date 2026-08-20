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
      permissions: ['medical.view', 'medical.clearance.manage'],
      categories: ['U19'],
    })
    const { getUserAccess } = await import('./access')

    const access = await getUserAccess()

    expect(getEffectiveAccess).toHaveBeenCalledWith({ teamId: 'team-1', userId: 'medical-1' })
    expect(access.isClubAdmin).toBe(false)
    expect(access.permissions).toEqual(new Set(['medical.view', 'medical.clearance.manage']))
    expect(access.categories).toEqual(['U19'])
  })
})

describe('can', () => {
  it('keeps medical.manage as a backward-compatible full medical capability', async () => {
    const { can } = await import('./access')
    const access = {
      userId: 'legacy-medical',
      teamId: 'team-1',
      isClubAdmin: false,
      permissions: new Set(['medical.manage']),
      categories: ['u19'],
    } as const

    expect(can(access, 'medical.view')).toBe(true)
    expect(can(access, 'medical.injuries.manage')).toBe(true)
    expect(can(access, 'medical.followups.manage')).toBe(true)
    expect(can(access, 'medical.rtp.manage')).toBe(true)
    expect(can(access, 'medical.clearance.manage')).toBe(true)
    expect(can(access, 'medical.documents.manage')).toBe(true)
    expect(can(access, 'medical.settings.manage')).toBe(true)
  })

  it('does not let one granular capability imply another', async () => {
    const { can } = await import('./access')
    const access = {
      userId: 'physio-1',
      teamId: 'team-1',
      isClubAdmin: false,
      permissions: new Set(['medical.view', 'medical.rtp.manage']),
      categories: ['u19'],
    } as const

    expect(can(access, 'medical.rtp.manage')).toBe(true)
    expect(can(access, 'medical.clearance.manage')).toBe(false)
    expect(can(access, 'medical.settings.manage')).toBe(false)
  })
})
