import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import type { Journee } from '@/lib/entities'
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

describe('dataAccess/journees (real SQLite)', () => {
  it('fetchJourneeWithSeason includes the related saison', async () => {
    const { fetchJourneeWithSeason } = await import('./journees')
    const { journee, saison } = await seedBaseGraph(dataSource)

    const found = await fetchJourneeWithSeason(journee.id)
    expect(found?.saison.id).toBe(saison.id)
  })

  it('fetchCurrentAndPreviousJournees splits journees around today', async () => {
    const { fetchCurrentAndPreviousJournees } = await import('./journees')
    const { league, saison } = await seedBaseGraph(dataSource)
    const journeeRepo = dataSource.getRepository<Journee>('journees')

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const previous = await journeeRepo.save(
      journeeRepo.create({ saison_id: saison.id, numero: 1, date_journee: yesterday })
    )
    const current = await journeeRepo.save(
      journeeRepo.create({ saison_id: saison.id, numero: 2, date_journee: tomorrow })
    )

    const result = await fetchCurrentAndPreviousJournees(league.id)
    expect(result.current?.id).toBe(current.id)
    expect(result.previous?.id).toBe(previous.id)
  })

  it('fetchCurrentAndPreviousJournees returns nulls when there are no journees', async () => {
    const { fetchCurrentAndPreviousJournees } = await import('./journees')
    const result = await fetchCurrentAndPreviousJournees()
    expect(result).toEqual({ current: null, previous: null })
  })

  it('fetchNextJourneeMatches returns the next journee with its matches', async () => {
    const { fetchNextJourneeMatches } = await import('./journees')
    const { journee, match, league } = await seedBaseGraph(dataSource)
    // The seeded journee's date is in the past relative to "now" in most cases; force it forward.
    const journeeRepo = dataSource.getRepository<Journee>('journees')
    await journeeRepo.update(journee.id, { date_journee: new Date(Date.now() + 24 * 60 * 60 * 1000) })

    const result = await fetchNextJourneeMatches(new Date(), league.id)
    expect(result?.journee.id).toBe(journee.id)
    expect(result?.matches.map((m) => m.id)).toEqual([match.id])
  })

  it('fetchNextJourneeMatches returns null when there is no journee at all', async () => {
    const { fetchNextJourneeMatches } = await import('./journees')
    const result = await fetchNextJourneeMatches(new Date(), '00000000-0000-0000-0000-000000000000')
    expect(result).toBeNull()
  })

  it('fetchUpcomingMatches only includes matches from journees dated today or later', async () => {
    const { fetchUpcomingMatches } = await import('./journees')
    const { journee, match, league } = await seedBaseGraph(dataSource)
    const journeeRepo = dataSource.getRepository<Journee>('journees')

    // Move the seeded journee into the past: it must be excluded from "upcoming".
    await journeeRepo.update(journee.id, { date_journee: new Date(Date.now() - 24 * 60 * 60 * 1000) })

    const upcomingBefore = await fetchUpcomingMatches(new Date(), league.id)
    expect(upcomingBefore).toEqual([])

    await journeeRepo.update(journee.id, { date_journee: new Date(Date.now() + 24 * 60 * 60 * 1000) })
    const upcomingAfter = await fetchUpcomingMatches(new Date(), league.id)
    expect(upcomingAfter.map((m) => m.id)).toEqual([match.id])
  })
})
