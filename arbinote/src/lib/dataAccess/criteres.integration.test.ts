import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { CritereDefinitionEntity } from '@/lib/entities'

let dataSource: DataSource

vi.mock('../db', () => ({
  getDataSource: async () => dataSource,
}))

beforeEach(async () => {
  dataSource = await createTestDataSource()
})

afterEach(async () => dataSource.destroy())

describe('dataAccess/criteres (real SQLite)', () => {
  it('only returns the version active now, never a future or retired one', async () => {
    const { fetchCritereDefinitionsUncached } = await import('./criteres')
    const repo = dataSource.getRepository(CritereDefinitionEntity)
    await repo.save([
      repo.create({
        id: 'decisions',
        version: 1,
        effective_from: new Date('2020-01-01T00:00:00Z'),
        effective_until: new Date('2026-01-01T00:00:00Z'),
        categorie: 'arbitre',
        label_fr: 'Ancien libellé',
        label_ar: 'قديم',
      }),
      repo.create({
        id: 'decisions',
        version: 2,
        effective_from: new Date('2026-01-01T00:00:00Z'),
        categorie: 'arbitre',
        label_fr: 'Nouveau libellé',
        label_ar: 'جديد',
      }),
    ])

    const active = await fetchCritereDefinitionsUncached()
    expect(active).toHaveLength(1)
    expect(active[0].version).toBe(2)
    expect(active[0].label_fr).toBe('Nouveau libellé')
  })

  it('excludes a criterion scoped to a season/competition (global reads only)', async () => {
    const { fetchCritereDefinitionsUncached } = await import('./criteres')
    const repo = dataSource.getRepository(CritereDefinitionEntity)
    await repo.save(
      repo.create({
        id: 'season_only',
        version: 1,
        season_id: '11111111-1111-1111-1111-111111111111',
        effective_from: new Date('2020-01-01T00:00:00Z'),
        categorie: 'arbitre',
        label_fr: 'Spécifique saison',
        label_ar: 'خاص',
      }),
    )

    const active = await fetchCritereDefinitionsUncached()
    expect(active).toHaveLength(0)
  })

  it('excludes a criterion not yet effective', async () => {
    const { fetchCritereDefinitionsUncached } = await import('./criteres')
    const repo = dataSource.getRepository(CritereDefinitionEntity)
    await repo.save(
      repo.create({
        id: 'future',
        version: 1,
        effective_from: new Date('2099-01-01T00:00:00Z'),
        categorie: 'arbitre',
        label_fr: 'Futur',
        label_ar: 'مستقبل',
      }),
    )

    const active = await fetchCritereDefinitionsUncached()
    expect(active).toHaveLength(0)
  })
})
