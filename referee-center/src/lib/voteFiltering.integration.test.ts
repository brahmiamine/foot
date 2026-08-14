import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import type { Vote } from '@/lib/entities'
import { createTestDataSource } from '@/test/testDataSource'
import { seedBaseGraph, seedVote } from '@/test/fixtures'

let dataSource: DataSource

vi.mock('./db', () => ({
  getDataSource: async () => dataSource,
}))

beforeEach(async () => {
  dataSource = await createTestDataSource()
})

afterEach(async () => {
  await dataSource.destroy()
})

describe('voteFiltering (real SQLite)', () => {
  it('getSuspiciousVoteIds returns null for an unknown match', async () => {
    const { getSuspiciousVoteIds } = await import('./voteFiltering')
    const result = await getSuspiciousVoteIds('00000000-0000-0000-0000-000000000000')
    expect(result).toBeNull()
  })

  it('getSuspiciousVoteIds returns an empty set for a normal, non-suspicious match', async () => {
    const { getSuspiciousVoteIds } = await import('./voteFiltering')
    const { match, arbitre } = await seedBaseGraph(dataSource)
    for (const note of [3, 4, 5, 2, 3]) {
      await seedVote(dataSource, match.id, arbitre.id, { note_globale: note })
    }

    const suspicious = await getSuspiciousVoteIds(match.id)
    expect(suspicious).toEqual(new Set())
  })

  it('getSuspiciousVoteIds flags extreme, time-clustered votes as suspicious', async () => {
    const { getSuspiciousVoteIds } = await import('./voteFiltering')
    const { match, arbitre } = await seedBaseGraph(dataSource)

    const votes = []
    for (let i = 0; i < 6; i++) {
      votes.push(
        await seedVote(dataSource, match.id, arbitre.id, {
          note_globale: 5,
          created_at: new Date(Date.now() + i * 60 * 1000),
        })
      )
    }

    const suspicious = await getSuspiciousVoteIds(match.id)
    expect(suspicious?.size).toBe(6)
    votes.forEach((v) => expect(suspicious?.has((v as { id: string }).id)).toBe(true))
  })

  it('filterSuspiciousVotes removes only the suspicious votes for a match, keeping the rest', async () => {
    const { filterSuspiciousVotes } = await import('./voteFiltering')
    const { match, arbitre } = await seedBaseGraph(dataSource)

    const legitVotes = []
    for (const note of [3, 4, 3, 4, 3]) {
      legitVotes.push(await seedVote(dataSource, match.id, arbitre.id, { note_globale: note }))
    }

    const filtered = await filterSuspiciousVotes(
      legitVotes.map((v) => ({ id: (v as { id: string }).id, match_id: match.id })),
      match.id
    )
    expect(filtered).toHaveLength(legitVotes.length)
  })

  it('filterSuspiciousVotesBatch handles votes from multiple matches independently', async () => {
    const { filterSuspiciousVotesBatch } = await import('./voteFiltering')
    const { match: matchA, arbitre, journee } = await seedBaseGraph(dataSource)

    const matchRepo = dataSource.getRepository('matches')
    const teamRepo = dataSource.getRepository('teams')
    const t1 = await teamRepo.save(teamRepo.create({ nom: 'T1', team_type: 'club', sport: 'football', age_category: 'seniors' }))
    const t2 = await teamRepo.save(teamRepo.create({ nom: 'T2', team_type: 'club', sport: 'football', age_category: 'seniors' }))
    const matchB = await matchRepo.save(
      matchRepo.create({
        journee_id: journee.id,
        equipe_home_id: (t1 as { id: string }).id,
        equipe_away_id: (t2 as { id: string }).id,
        date: new Date(),
      })
    )

    // matchA: 6 clustered extreme votes -> suspicious, all excluded.
    const suspiciousVotes: Vote[] = []
    for (let i = 0; i < 6; i++) {
      suspiciousVotes.push(
        await seedVote(dataSource, matchA.id, arbitre.id, {
          note_globale: 5,
          created_at: new Date(Date.now() + i * 60 * 1000),
        })
      )
    }
    // matchB: normal spread-out votes -> kept.
    const normalVotes: Vote[] = []
    for (const note of [3, 4, 2, 5, 3]) {
      normalVotes.push(
        await seedVote(dataSource, (matchB as { id: string }).id, arbitre.id, {
          note_globale: note,
          created_at: new Date(Date.now() + Math.random() * 1000 * 60 * 60 * 24),
        })
      )
    }

    const allVotes = [...suspiciousVotes, ...normalVotes].map((v) => ({
      id: v.id,
      match_id: v.match_id,
      note_globale: v.note_globale,
      created_at: v.created_at,
      device_fingerprint: v.device_fingerprint,
      ip_address: v.ip_address,
    }))

    const filtered = await filterSuspiciousVotesBatch(allVotes)
    const filteredIds = new Set(filtered.map((v) => v.id))

    suspiciousVotes.forEach((v) => expect(filteredIds.has((v as { id: string }).id)).toBe(false))
    normalVotes.forEach((v) => expect(filteredIds.has((v as { id: string }).id)).toBe(true))
  })

  it('filterSuspiciousVotesBatch returns the input unchanged when there are no votes', async () => {
    const { filterSuspiciousVotesBatch } = await import('./voteFiltering')
    expect(await filterSuspiciousVotesBatch([])).toEqual([])
  })
})
