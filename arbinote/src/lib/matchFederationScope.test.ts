import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { seedBaseGraph } from '@/test/fixtures'
import { Saison } from '@/lib/entities'
import { getMatchFederationId } from './matchFederationScope'

let dataSource: DataSource

beforeEach(async () => {
  dataSource = await createTestDataSource()
})

afterEach(async () => {
  await dataSource.destroy()
})

describe('getMatchFederationId (migration.md §9 — résolution match → fédération, arbinote)', () => {
  it('resolves the federation through match -> journée -> saison -> ligue', async () => {
    const { federation, match } = await seedBaseGraph(dataSource)
    expect(await getMatchFederationId(dataSource, match.id)).toBe(federation.id)
  })

  it('returns null for an unknown match', async () => {
    expect(await getMatchFederationId(dataSource, 'does-not-exist')).toBeNull()
  })

  it('returns null when the season has no league', async () => {
    const { match, saison } = await seedBaseGraph(dataSource)
    await dataSource.getRepository(Saison).update(saison.id, { league_id: null })
    expect(await getMatchFederationId(dataSource, match.id)).toBeNull()
  })
})
