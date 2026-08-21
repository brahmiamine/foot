import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { OfficialRefereeCriterion } from './entities'

let dataSource: DataSource

vi.mock('./db', () => ({ getDataSource: async () => dataSource }))

const baseline = new Date('2026-01-01T00:00:00Z')

beforeEach(async () => {
  dataSource = await createTestDataSource()
  await dataSource.getRepository(OfficialRefereeCriterion).save([
    { id: 'decisions', version: 1, effective_from: baseline, label_fr: 'Décisions', weight: 2, display_order: 1, is_active: true },
    { id: 'placement', version: 1, effective_from: baseline, label_fr: 'Placement', weight: 1, display_order: 2, is_active: true },
    { id: 'legacy', version: 1, effective_from: baseline, label_fr: 'Ancien critère', weight: 1, display_order: 3, is_active: false },
  ])
})

afterEach(async () => dataSource.destroy())

describe('calculateOfficialScore', () => {
  it('derives a weighted score from every active private criterion', async () => {
    const { calculateOfficialScore } = await import('./officialRefereeCriteria')
    const at = new Date('2026-06-01T00:00:00Z')
    await expect(calculateOfficialScore({ decisions: 5, placement: 2 }, { at })).resolves.toEqual({
      scores: { decisions: 5, placement: 2 },
      note: 4,
      criteriaEffectiveAt: at,
    })
  })

  it('rejects missing, inactive, unknown, and out-of-range scores', async () => {
    const { calculateOfficialScore } = await import('./officialRefereeCriteria')
    await expect(calculateOfficialScore({ decisions: 5 })).rejects.toThrow('placement')
    await expect(calculateOfficialScore({ decisions: 5, placement: 2, legacy: 4 })).rejects.toThrow('inconnu ou inactif')
    await expect(calculateOfficialScore({ decisions: 6, placement: 2 })).rejects.toThrow('1 à 5')
  })
})

describe('REF-007 versioning', () => {
  it('resolves the criterion version active at a given instant, never a future one', async () => {
    const { listOfficialCriteria, updateOfficialCriterion } = await import('./officialRefereeCriteria')
    await updateOfficialCriterion('decisions', { weight: 5 })

    const past = await listOfficialCriteria({ at: new Date('2026-03-01T00:00:00Z') })
    expect(past.find((c) => c.id === 'decisions')?.weight).toBe(2)
    expect(past.find((c) => c.id === 'decisions')?.version).toBe(1)

    const now = await listOfficialCriteria({ at: new Date() })
    expect(now.find((c) => c.id === 'decisions')?.weight).toBe(5)
    expect(now.find((c) => c.id === 'decisions')?.version).toBe(2)
  })

  it('never retroactively changes an evaluation already scored against an older version', async () => {
    const { calculateOfficialScore, updateOfficialCriterion } = await import('./officialRefereeCriteria')
    const evaluationCreatedAt = new Date('2026-02-01T00:00:00Z')
    const original = await calculateOfficialScore({ decisions: 4, placement: 2 }, { at: evaluationCreatedAt })
    expect(original.note).toBe(3.33)

    await updateOfficialCriterion('decisions', { weight: 10 })

    const recomputedAtOriginalTime = await calculateOfficialScore({ decisions: 4, placement: 2 }, { at: evaluationCreatedAt })
    expect(recomputedAtOriginalTime.note).toBe(original.note)
  })

  it('keeps the full version history of a criterion', async () => {
    const { listOfficialCriterionVersions, updateOfficialCriterion } = await import('./officialRefereeCriteria')
    await updateOfficialCriterion('decisions', { weight: 3 })
    await updateOfficialCriterion('decisions', { weight: 4 })
    const versions = await listOfficialCriterionVersions('decisions')
    expect(versions.map((v) => v.version)).toEqual([3, 2, 1])
    expect(versions[2].effective_until).not.toBeNull()
    expect(versions[0].effective_until).toBeNull()
  })
})
