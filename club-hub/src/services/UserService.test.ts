import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClubIdentityPort } from '@/adapters/identity/createClubIdentityAdapter'

const listUsers = vi.fn()
const getUserById = vi.fn()
const getUserByEmail = vi.fn()
const createUser = vi.fn()
const updateUser = vi.fn()
const deleteUser = vi.fn()

const identity: ClubIdentityPort = {
  listUsers: (...args) => listUsers(...args),
  getUserById: (...args) => getUserById(...args),
  getUserByEmail: (...args) => getUserByEmail(...args),
  createUser: (...args) => createUser(...args),
  updateUser: (...args) => updateUser(...args),
  deleteUser: (...args) => deleteUser(...args),
}

const baseUser = {
  id: 'user-1',
  name: 'User One',
  email: 'user@example.com',
  role: 'OBSERVATEUR' as const,
  isActive: true,
  teamId: 'team-1',
  createdAt: new Date('2026-08-15T10:00:00Z').toISOString(),
}

beforeEach(() => {
  listUsers.mockReset()
  getUserById.mockReset()
  getUserByEmail.mockReset()
  createUser.mockReset()
  updateUser.mockReset()
  deleteUser.mockReset()
})

describe('UserService Identity boundary', () => {
  it('creates only OBSERVATEUR accounts inside the current club', async () => {
    getUserByEmail.mockResolvedValue(null)
    createUser.mockResolvedValue(baseUser)
    const { UserService } = await import('./UserService')

    const result = await new UserService(identity).create(
      { name: baseUser.name, email: baseUser.email, password: 'secret' },
      'team-1',
    )

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'OBSERVATEUR', teamId: 'team-1' }),
    )
    expect(result.id).toBe('user-1')
  })

  it('does not expose an account from another club', async () => {
    getUserById.mockResolvedValue({ ...baseUser, teamId: 'team-2' })
    const { UserService } = await import('./UserService')

    await expect(new UserService(identity).findById('user-1', 'team-1')).resolves.toBeNull()
  })

  it('refuses to deactivate the club ADMIN account', async () => {
    getUserById.mockResolvedValue({ ...baseUser, role: 'ADMIN' })
    const { UserService } = await import('./UserService')

    await expect(
      new UserService(identity).update('user-1', 'team-1', { isActive: false }),
    ).rejects.toThrow('Impossible de désactiver le compte administrateur du club')
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('refuses to delete the club ADMIN account', async () => {
    getUserById.mockResolvedValue({ ...baseUser, role: 'ADMIN' })
    const { UserService } = await import('./UserService')

    await expect(new UserService(identity).delete('user-1', 'team-1')).rejects.toThrow(
      'Impossible de supprimer le compte administrateur du club',
    )
    expect(deleteUser).not.toHaveBeenCalled()
  })
})
