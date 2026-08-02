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

describe('dataAccess/matches (real SQLite)', () => {
  it('fetchMatchById returns the match with its relations populated', async () => {
    const { fetchMatchById } = await import('./matches')
    const { match, homeTeam, awayTeam, arbitre } = await seedBaseGraph(dataSource)

    const found = await fetchMatchById(match.id)
    expect(found?.equipe_home.id).toBe(homeTeam.id)
    expect(found?.equipe_away.id).toBe(awayTeam.id)
    expect(found?.arbitre?.id).toBe(arbitre.id)
    expect(found?.journee.saison).toBeTruthy()
  })

  it('fetchMatchById returns null for an unknown id', async () => {
    const { fetchMatchById } = await import('./matches')
    await seedBaseGraph(dataSource)
    const found = await fetchMatchById('00000000-0000-0000-0000-000000000000')
    expect(found).toBeNull()
  })

  it('fetchMatchesByTeam finds matches where the team plays home or away', async () => {
    const { fetchMatchesByTeam } = await import('./matches')
    const { homeTeam, awayTeam, match } = await seedBaseGraph(dataSource)

    const forHome = await fetchMatchesByTeam(homeTeam.id)
    const forAway = await fetchMatchesByTeam(awayTeam.id)
    expect(forHome.map((m) => m.id)).toEqual([match.id])
    expect(forAway.map((m) => m.id)).toEqual([match.id])
  })

  it('fetchMatchesByJourneeIds selects only id and journee_id', async () => {
    const { fetchMatchesByJourneeIds } = await import('./matches')
    const { match, journee } = await seedBaseGraph(dataSource)

    const rows = await fetchMatchesByJourneeIds([journee.id])
    expect(rows).toEqual([{ id: match.id, journee_id: journee.id }])
  })

  it('fetchMatchesByJourneeIds returns an empty array without querying for an empty input', async () => {
    const { fetchMatchesByJourneeIds } = await import('./matches')
    expect(await fetchMatchesByJourneeIds([])).toEqual([])
  })

  it('fetchMatchesByJourneeWithUserVote attaches null user_vote without a fingerprint', async () => {
    const { fetchMatchesByJourneeWithUserVote } = await import('./matches')
    const { match, journee, arbitre } = await seedBaseGraph(dataSource)
    await seedVote(dataSource, match.id, arbitre.id)

    const matches = await fetchMatchesByJourneeWithUserVote(journee.id, null)
    expect(matches[0].user_vote).toBeNull()
  })

  it("fetchMatchesByJourneeWithUserVote attaches the caller's own vote by fingerprint", async () => {
    const { fetchMatchesByJourneeWithUserVote } = await import('./matches')
    const { match, journee, arbitre } = await seedBaseGraph(dataSource)
    await seedVote(dataSource, match.id, arbitre.id, {
      device_fingerprint: 'fp-mine',
      note_globale: 4.5,
    })
    await seedVote(dataSource, match.id, arbitre.id, {
      device_fingerprint: 'fp-someone-else',
      note_globale: 1,
    })

    const matches = await fetchMatchesByJourneeWithUserVote(journee.id, 'fp-mine')
    expect(matches).toHaveLength(1)
    expect(matches[0].user_vote).toBeTruthy()
    expect(matches[0].user_vote.device_fingerprint).toBe('fp-mine')
    expect(matches[0].user_vote.note_globale).toBe(4.5)
  })

  it("fetchMatchesByJourneeWithUserVote keeps user_vote null when the fingerprint hasn't voted", async () => {
    const { fetchMatchesByJourneeWithUserVote } = await import('./matches')
    const { match, journee, arbitre } = await seedBaseGraph(dataSource)
    await seedVote(dataSource, match.id, arbitre.id, { device_fingerprint: 'fp-someone-else' })

    const matches = await fetchMatchesByJourneeWithUserVote(journee.id, 'fp-mine')
    expect(matches[0].user_vote).toBeNull()
  })
})
