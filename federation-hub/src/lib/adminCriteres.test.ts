import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'

let dataSource: DataSource

vi.mock('./db', () => ({ getDataSource: async () => dataSource }))

beforeEach(async () => {
  dataSource = await createTestDataSource()
})

afterEach(async () => dataSource.destroy())

describe('adminCriteres (ARBI-004 versioning)', () => {
  it('creates a critere as version 1, effective immediately', async () => {
    const { createCritere, listCriteres } = await import('./adminCriteres')
    await createCritere({ id: 'fairplay', categorie: 'arbitre', label_fr: 'Fair-play', label_ar: 'اللعب النظيف' })

    const active = await listCriteres()
    expect(active).toHaveLength(1)
    expect(active[0].version).toBe(1)
  })

  it('rejects creating a duplicate id', async () => {
    const { createCritere } = await import('./adminCriteres')
    await createCritere({ id: 'fairplay', categorie: 'arbitre', label_fr: 'Fair-play', label_ar: 'اللعب النظيف' })
    await expect(
      createCritere({ id: 'fairplay', categorie: 'arbitre', label_fr: 'Autre', label_ar: 'آخر' }),
    ).rejects.toThrow('existe déjà')
  })

  it('never mutates a version in place — update closes the current version and inserts the next', async () => {
    const { createCritere, updateCritere, listCritereVersions, listCriteres } = await import('./adminCriteres')
    await createCritere({ id: 'fairplay', categorie: 'arbitre', label_fr: 'Fair-play', label_ar: 'اللعب النظيف' })
    await updateCritere('fairplay', { label_fr: 'Fair-play (v2)' })

    const versions = await listCritereVersions('fairplay')
    expect(versions.map((v) => v.version)).toEqual([2, 1])
    expect(versions[1].effective_until).not.toBeNull()
    expect(versions[0].effective_until).toBeNull()
    expect(versions[1].label_fr).toBe('Fair-play')

    const active = await listCriteres()
    expect(active).toHaveLength(1)
    expect(active[0].version).toBe(2)
    expect(active[0].label_fr).toBe('Fair-play (v2)')
  })

  it('retires (soft) instead of deleting — the row survives, just no longer active', async () => {
    const { createCritere, deleteCritere, listCriteres, listCritereVersions } = await import('./adminCriteres')
    await createCritere({ id: 'fairplay', categorie: 'arbitre', label_fr: 'Fair-play', label_ar: 'اللعب النظيف' })
    await deleteCritere('fairplay')

    expect(await listCriteres()).toHaveLength(0)
    const versions = await listCritereVersions('fairplay')
    expect(versions).toHaveLength(1)
    expect(versions[0].effective_until).not.toBeNull()
  })

  it('rejects retiring an already-retired critere', async () => {
    const { createCritere, deleteCritere } = await import('./adminCriteres')
    await createCritere({ id: 'fairplay', categorie: 'arbitre', label_fr: 'Fair-play', label_ar: 'اللعب النظيف' })
    await deleteCritere('fairplay')
    await expect(deleteCritere('fairplay')).rejects.toThrow('déjà retiré')
  })
})
