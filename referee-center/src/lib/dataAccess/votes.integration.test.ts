import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { seedBaseGraph, seedVote } from '@/test/fixtures'

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

describe('dataAccess/votes (real SQLite)', () => {
  it('fetchVotesByArbitre returns votes ordered by created_at descending', async () => {
    const { fetchVotesByArbitre } = await import('./votes')
    const { match, arbitre } = await seedBaseGraph(dataSource)

    await seedVote(dataSource, match.id, arbitre.id, {
      note_globale: 3,
      created_at: new Date('2026-01-01T00:00:00Z'),
    })
    await seedVote(dataSource, match.id, arbitre.id, {
      note_globale: 5,
      created_at: new Date('2026-01-05T00:00:00Z'),
    })

    const votes = await fetchVotesByArbitre(arbitre.id, false)
    expect(votes.map((v) => v.note_globale)).toEqual([5, 3])
  })

  it('fetchVotesByArbitre excludes suspicious votes when filtering is enabled', async () => {
    const { fetchVotesByArbitre } = await import('./votes')
    const { match, arbitre } = await seedBaseGraph(dataSource)

    // 5 extreme votes clustered within a couple of minutes: flagged suspicious by
    // detectVoteAnomalies (extreme-vote clustering + time grouping).
    for (let i = 0; i < 5; i++) {
      await seedVote(dataSource, match.id, arbitre.id, {
        note_globale: 5,
        created_at: new Date(Date.now() + i * 60 * 1000),
      })
    }

    const unfiltered = await fetchVotesByArbitre(arbitre.id, false)
    const filtered = await fetchVotesByArbitre(arbitre.id, true)

    expect(unfiltered).toHaveLength(5)
    expect(filtered).toHaveLength(0)
  })

  it('fetchVotesByArbitre keeps normal votes when filtering is enabled', async () => {
    const { fetchVotesByArbitre } = await import('./votes')
    const { match, arbitre } = await seedBaseGraph(dataSource)

    await seedVote(dataSource, match.id, arbitre.id, { note_globale: 4 })
    const filtered = await fetchVotesByArbitre(arbitre.id, true)
    expect(filtered).toHaveLength(1)
  })
})
