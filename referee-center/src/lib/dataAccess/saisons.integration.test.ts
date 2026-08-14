import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { seedBaseGraph } from '@/test/fixtures'

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

describe('dataAccess/saisons (real SQLite)', () => {
  it('fetchSaisonById returns the plain saison row', async () => {
    const { fetchSaisonById } = await import('./saisons')
    const { saison } = await seedBaseGraph(dataSource)

    const found = await fetchSaisonById(saison.id)
    expect(found?.nom).toBe('Saison 2025-2026')
  })

  it('fetchAllSaisons orders by date_debut ascending and can filter by league', async () => {
    const { fetchAllSaisons } = await import('./saisons')
    const { saison, league } = await seedBaseGraph(dataSource)

    const saisonRepo = dataSource.getRepository('saisons')
    const earlierSaison = await saisonRepo.save(
      saisonRepo.create({
        nom: 'Saison 2024-2025',
        type_competition: 'championnat',
        league_id: league.id,
        date_debut: '2024-08-01',
        date_fin: '2025-06-01',
      })
    )

    const all = await fetchAllSaisons(league.id)
    expect(all.map((s) => s.id)).toEqual([(earlierSaison as { id: string }).id, saison.id])
  })

  it('fetchAllSaisons returns an empty array for a league with no seasons', async () => {
    const { fetchAllSaisons } = await import('./saisons')
    await seedBaseGraph(dataSource)
    const all = await fetchAllSaisons('00000000-0000-0000-0000-000000000000')
    expect(all).toEqual([])
  })

  it('fetchFeaturedSaisons limits results and orders by date_debut descending', async () => {
    const { fetchFeaturedSaisons } = await import('./saisons')
    const { saison, league } = await seedBaseGraph(dataSource)

    const saisonRepo = dataSource.getRepository('saisons')
    const olderSaison = await saisonRepo.save(
      saisonRepo.create({
        nom: 'Saison 2023-2024',
        type_competition: 'championnat',
        league_id: league.id,
        date_debut: '2023-08-01',
        date_fin: '2024-06-01',
      })
    )

    const featured = await fetchFeaturedSaisons(1, league.id)
    expect(featured).toHaveLength(1)
    expect(featured[0].id).toBe(saison.id)
    expect(olderSaison).toBeTruthy()
  })
})
