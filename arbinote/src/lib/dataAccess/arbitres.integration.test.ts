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

describe('dataAccess/arbitres (real SQLite)', () => {
  it('fetchArbitreById returns the plain arbitre row', async () => {
    const { fetchArbitreById } = await import('./arbitres')
    const { arbitre } = await seedBaseGraph(dataSource)

    const found = await fetchArbitreById(arbitre.id)
    expect(found?.nom).toBe('Jean Dupont')
    expect(found?.nom_en).toBe('John Doe')
  })

  it('fetchArbitreById returns null for an unknown id', async () => {
    const { fetchArbitreById } = await import('./arbitres')
    await seedBaseGraph(dataSource)
    const found = await fetchArbitreById('00000000-0000-0000-0000-000000000000')
    expect(found).toBeNull()
  })

  it('fetchMatchesByArbitre returns the matches officiated by that referee, most recent first', async () => {
    const { fetchMatchesByArbitre } = await import('./arbitres')
    const { arbitre, match, journee } = await seedBaseGraph(dataSource)

    const matchRepo = dataSource.getRepository('matches')
    const olderMatch = await matchRepo.save(
      matchRepo.create({
        journee_id: journee.id,
        equipe_home_id: match.equipe_home_id,
        equipe_away_id: match.equipe_away_id,
        arbitre_id: arbitre.id,
        date: new Date('2025-12-01T20:00:00Z'),
      })
    )

    const matches = await fetchMatchesByArbitre(arbitre.id)
    expect(matches.map((m) => m.id)).toEqual([match.id, (olderMatch as { id: string }).id])
  })

  it('fetchMatchesByArbitre returns an empty array for a referee with no matches', async () => {
    const { fetchMatchesByArbitre } = await import('./arbitres')
    const { arbitre } = await seedBaseGraph(dataSource)
    const arbitreRepo = dataSource.getRepository('arbitres')
    const other = await arbitreRepo.save(arbitreRepo.create({ nom: 'Sans Match' }))
    expect(arbitre).toBeTruthy()
    const matches = await fetchMatchesByArbitre((other as { id: string }).id)
    expect(matches).toEqual([])
  })
})
