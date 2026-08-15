import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { seedUser } from '@/test/fixtures'

let dataSource: DataSource

vi.mock('@/lib/db', () => ({
  getDataSource: async () => dataSource,
}))

beforeEach(async () => {
  dataSource = await createTestDataSource()
})

afterEach(async () => {
  await dataSource.destroy()
})

describe('Identity account profile lifecycle', () => {
  it('preserves an explicitly inactive initial state', async () => {
    const { createUser } = await import('./identityService')

    const result = await createUser({
      name: 'Inactive user',
      email: 'inactive@example.com',
      password: 'secret-password',
      role: 'OBSERVATEUR',
      isActive: false,
      teamId: 'team-1',
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.user.isActive).toBe(false)
  })

  it('updates name and email inside Identity', async () => {
    const { updateUser } = await import('./identityService')
    await seedUser(dataSource, {
      id: 'user-1',
      name: 'Old name',
      email: 'old@example.com',
      teamId: 'team-1',
    })

    const result = await updateUser('user-1', {
      name: 'New name',
      email: 'new@example.com',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.user.name).toBe('New name')
      expect(result.user.email).toBe('new@example.com')
    }
  })

  it('rejects an email already owned by another account', async () => {
    const { updateUser } = await import('./identityService')
    await seedUser(dataSource, { id: 'user-1', email: 'one@example.com' })
    await seedUser(dataSource, { id: 'user-2', email: 'two@example.com' })

    await expect(updateUser('user-1', { email: 'two@example.com' })).resolves.toEqual({
      ok: false,
      error: 'email_taken',
    })
  })
})
