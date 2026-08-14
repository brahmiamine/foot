import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { OfficialRefereeCriterion } from './entities'

let dataSource: DataSource

vi.mock('./db', () => ({ getDataSource: async () => dataSource }))

beforeEach(async () => {
  dataSource = await createTestDataSource()
  await dataSource.getRepository(OfficialRefereeCriterion).save([
    { id: 'decisions', label_fr: 'Décisions', weight: 2, display_order: 1, is_active: true },
    { id: 'placement', label_fr: 'Placement', weight: 1, display_order: 2, is_active: true },
    { id: 'legacy', label_fr: 'Ancien critère', weight: 1, display_order: 3, is_active: false },
  ])
})

afterEach(async () => dataSource.destroy())

describe('calculateOfficialScore', () => {
  it('derives a weighted score from every active private criterion', async () => {
    const { calculateOfficialScore } = await import('./officialRefereeCriteria')
    await expect(calculateOfficialScore({ decisions: 5, placement: 2 })).resolves.toEqual({
      scores: { decisions: 5, placement: 2 },
      note: 4,
    })
  })

  it('rejects missing, inactive, unknown, and out-of-range scores', async () => {
    const { calculateOfficialScore } = await import('./officialRefereeCriteria')
    await expect(calculateOfficialScore({ decisions: 5 })).rejects.toThrow('placement')
    await expect(calculateOfficialScore({ decisions: 5, placement: 2, legacy: 4 })).rejects.toThrow('inconnu ou inactif')
    await expect(calculateOfficialScore({ decisions: 6, placement: 2 })).rejects.toThrow('1 à 5')
  })
})
