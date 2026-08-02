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

describe('dataAccess/teams (real SQLite)', () => {
  it('fetchTeamById returns the plain team row', async () => {
    const { fetchTeamById } = await import('./teams')
    const { homeTeam } = await seedBaseGraph(dataSource)

    const found = await fetchTeamById(homeTeam.id)
    expect(found?.nom).toBe('Espérance de Tunis')
    expect(found?.abbr).toBe('EST')
  })

  it('fetchTeamById returns null for an unknown id', async () => {
    const { fetchTeamById } = await import('./teams')
    await seedBaseGraph(dataSource)
    const found = await fetchTeamById('00000000-0000-0000-0000-000000000000')
    expect(found).toBeNull()
  })

  it('fetchRefereeStatsForTeam aggregates votes per referee across the team matches', async () => {
    const { fetchRefereeStatsForTeam } = await import('./teams')
    const { homeTeam, match, arbitre } = await seedBaseGraph(dataSource)
    await seedVote(dataSource, match.id, arbitre.id, { note_globale: 5 })
    await seedVote(dataSource, match.id, arbitre.id, { note_globale: 3 })

    const stats = await fetchRefereeStatsForTeam(homeTeam.id)
    expect(stats).toHaveLength(1)
    expect(stats[0].arbitre?.id).toBe(arbitre.id)
    expect(stats[0].matchCount).toBe(1)
    expect(stats[0].voteCount).toBe(2)
    expect(stats[0].averageNote).toBe(4)
  })

  it('fetchRefereeStatsForTeam returns an empty array when the team has no matches', async () => {
    const { fetchRefereeStatsForTeam } = await import('./teams')
    const { awayTeam } = await seedBaseGraph(dataSource)
    // awayTeam does have the seeded match though, so use an isolated team instead.
    const teamRepo = dataSource.getRepository('teams')
    const lonelyTeam = await teamRepo.save(
      teamRepo.create({ nom: 'Lonely FC', team_type: 'club', sport: 'football', age_category: 'seniors' })
    )
    const stats = await fetchRefereeStatsForTeam((lonelyTeam as { id: string }).id)
    expect(stats).toEqual([])
    // sanity: awayTeam is indeed part of a match (kept to document the fixture's shape)
    expect(awayTeam.nom).toBe('Club Africain')
  })

  it("fetchTopMatchesForTeam('arbitre') ranks matches by average referee note", async () => {
    const { fetchTopMatchesForTeam } = await import('./teams')
    const { homeTeam, match, arbitre } = await seedBaseGraph(dataSource)
    await seedVote(dataSource, match.id, arbitre.id, { note_globale: 4 })
    await seedVote(dataSource, match.id, arbitre.id, { note_globale: 2 })

    const top = await fetchTopMatchesForTeam(homeTeam.id, 'arbitre', 5)
    expect(top).toHaveLength(1)
    expect(top[0].match.id).toBe(match.id)
    expect(top[0].average).toBe(3)
    expect(top[0].voteCount).toBe(2)
  })

  it('fetchTopMatchesForTeam returns an empty array for a team with no matches', async () => {
    const { fetchTopMatchesForTeam } = await import('./teams')
    await seedBaseGraph(dataSource)
    const top = await fetchTopMatchesForTeam('00000000-0000-0000-0000-000000000000', 'arbitre', 5)
    expect(top).toEqual([])
  })
})
