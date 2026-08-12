import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'

let dataSource: DataSource

vi.mock('@/lib/db', () => ({
  getDataSource: async () => dataSource,
}))

const updateIdentityUser = vi.fn()
const deleteIdentityUser = vi.fn()
vi.mock('./identityClient', () => ({
  updateIdentityUser: (...args: unknown[]) => updateIdentityUser(...args),
  deleteIdentityUser: (...args: unknown[]) => deleteIdentityUser(...args),
}))

beforeEach(async () => {
  dataSource = await createTestDataSource()
  updateIdentityUser.mockReset()
  deleteIdentityUser.mockReset()
})

afterEach(async () => {
  await dataSource.destroy()
})

/** TS-53 (Epic E17) — updateClubUser/deleteClubUser délèguent à sso, plus d'écriture TypeORM directe dans User. */
describe('updateClubUser', () => {
  it('delegates to identityClient and shapes the response', async () => {
    const { updateClubUser } = await import('./clubAccounts')
    updateIdentityUser.mockResolvedValue({
      id: 'user-1',
      name: 'Amine',
      email: 'amine@example.com',
      role: 'ADMIN',
      isActive: false,
      teamId: 'team-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    })

    const result = await updateClubUser('user-1', { isActive: false })

    expect(updateIdentityUser).toHaveBeenCalledWith('user-1', { isActive: false })
    expect(result.isActive).toBe(false)
    // toPlain() fait un aller-retour JSON : comme le reste de ce fichier,
    // la Date reconstruite en interne ressort en string ISO au runtime,
    // même si le type déclaré (ClubUser.createdAt: Date) dit le contraire.
    expect(result.createdAt as unknown as string).toBe('2026-01-01T00:00:00.000Z')
  })

  it('maps a not_found error from sso to the historical French message', async () => {
    const { updateClubUser } = await import('./clubAccounts')
    updateIdentityUser.mockRejectedValue(new Error('not_found'))

    await expect(updateClubUser('does-not-exist', { isActive: false })).rejects.toThrow('Compte non trouvé')
  })

  it('propagates any other error unchanged', async () => {
    const { updateClubUser } = await import('./clubAccounts')
    updateIdentityUser.mockRejectedValue(new Error('sso a répondu 503'))

    await expect(updateClubUser('user-1', { isActive: false })).rejects.toThrow('sso a répondu 503')
  })
})

describe('deleteClubUser', () => {
  it('delegates to identityClient', async () => {
    const { deleteClubUser } = await import('./clubAccounts')
    deleteIdentityUser.mockResolvedValue(undefined)

    await deleteClubUser('user-1')

    expect(deleteIdentityUser).toHaveBeenCalledWith('user-1')
  })

  it('maps a not_found error from sso to the historical French message', async () => {
    const { deleteClubUser } = await import('./clubAccounts')
    deleteIdentityUser.mockRejectedValue(new Error('not_found'))

    await expect(deleteClubUser('does-not-exist')).rejects.toThrow('Compte non trouvé')
  })
})
