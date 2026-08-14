import { describe, expect, it } from 'vitest'
import { calculateVoteCredibility, detectVoteAnomalies, VoteData } from './voteAnomalyDetection'

const BASE = new Date('2026-01-10T20:00:00Z')

/** Builds `count` votes with the given note, spaced `spacingMinutes` apart so they don't
 * accidentally cluster within the 10-minute grouping window used by the detector. */
function spreadVotes(count: number, note: number, spacingMinutes = 60): VoteData[] {
  return Array.from({ length: count }, (_, i) => ({
    note_globale: note,
    created_at: new Date(BASE.getTime() + i * spacingMinutes * 60 * 1000),
  }))
}

describe('detectVoteAnomalies', () => {
  it('reports no anomaly for an empty vote list', () => {
    const result = detectVoteAnomalies([])
    expect(result).toEqual({ isSuspicious: false, confidence: 0, reasons: [], details: {} })
  })

  it('does not analyze fewer than 5 votes', () => {
    const result = detectVoteAnomalies(spreadVotes(4, 3))
    expect(result.isSuspicious).toBe(false)
    expect(result.confidence).toBe(0)
    expect(result.reasons).toEqual(['Pas assez de votes pour une analyse statistique fiable'])
    expect(result.details).toEqual({})
  })

  it('flags a match with no anomalies as not suspicious', () => {
    const votes: VoteData[] = [2, 3, 4, 5, 1, 3, 4, 2].map((note, i) => ({
      note_globale: note,
      created_at: new Date(BASE.getTime() + i * 24 * 60 * 60 * 1000),
    }))
    const result = detectVoteAnomalies(votes)
    expect(result.isSuspicious).toBe(false)
    expect(result.confidence).toBe(0)
    expect(result.reasons).toEqual([])
  })

  it('raises the score (but stays under the suspicion threshold) for >80% extreme votes', () => {
    const result = detectVoteAnomalies(spreadVotes(5, 5))
    expect(result.details.extremeVotesPercentage).toBe(100)
    expect(result.confidence).toBeCloseTo(0.4)
    expect(result.isSuspicious).toBe(false)
    expect(result.reasons.some((r) => r.includes('Trop de votes extrêmes'))).toBe(true)
  })

  it('raises a smaller score for extreme votes between 60% and 80%', () => {
    // 4 extreme + 1 normal, spread an hour apart to avoid the grouping/variance checks.
    const notes = [5, 5, 5, 5, 3]
    const votes: VoteData[] = notes.map((note, i) => ({
      note_globale: note,
      created_at: new Date(BASE.getTime() + i * 60 * 60 * 1000),
    }))
    const result = detectVoteAnomalies(votes)
    expect(result.details.extremeVotesPercentage).toBe(80)
    expect(result.confidence).toBeCloseTo(0.2)
    expect(result.reasons.some((r) => r.includes('Beaucoup de votes extrêmes'))).toBe(true)
  })

  it('flags votes clustered within a 10-minute window as suspicious brigading', () => {
    const votes: VoteData[] = Array.from({ length: 6 }, (_, i) => ({
      note_globale: 3,
      created_at: new Date(BASE.getTime() + i * 60 * 1000), // 1 minute apart
    }))
    const result = detectVoteAnomalies(votes)
    expect(result.details.timeGroupingDetected).toBe(true)
    expect(result.reasons.some((r) => r.includes('groupés dans le temps'))).toBe(true)
  })

  it('does not flag time grouping when votes are spread far apart', () => {
    const result = detectVoteAnomalies(spreadVotes(6, 3, 60))
    expect(result.details.timeGroupingDetected).toBe(false)
  })

  it('flags low variance (stdDev < 0.3) across >=10 votes as suspicious', () => {
    const votes: VoteData[] = [
      ...spreadVotes(5, 3.0, 60),
      ...spreadVotes(5, 3.2, 60).map((v, i) => ({
        ...v,
        created_at: new Date(BASE.getTime() + (5 + i) * 60 * 60 * 1000),
      })),
    ]
    const result = detectVoteAnomalies(votes)
    expect(result.details.variance).toBeLessThan(0.3)
    expect(result.confidence).toBeCloseTo(0.3)
    expect(result.reasons.some((r) => r.includes('Variance trop faible'))).toBe(true)
  })

  it('flags moderate variance (0.3 <= stdDev < 0.5) across >=15 votes more lightly', () => {
    const votes: VoteData[] = [
      ...spreadVotes(8, 3.0, 60),
      ...spreadVotes(7, 3.8, 60).map((v, i) => ({
        ...v,
        created_at: new Date(BASE.getTime() + (8 + i) * 60 * 60 * 1000),
      })),
    ]
    const result = detectVoteAnomalies(votes)
    expect(result.details.variance).toBeGreaterThanOrEqual(0.3)
    expect(result.details.variance).toBeLessThan(0.5)
    expect(result.confidence).toBeCloseTo(0.15)
    expect(result.reasons.some((r) => r.includes('Variance faible'))).toBe(true)
  })

  it('flags a burst of votes shortly after match opening (30-35 min) as suspicious', () => {
    const matchDate = BASE
    const earlyVotes: VoteData[] = Array.from({ length: 7 }, (_, i) => ({
      note_globale: 3,
      created_at: new Date(matchDate.getTime() + (30 * 60 + i * 10) * 1000),
    }))
    const laterVotes: VoteData[] = Array.from({ length: 3 }, (_, i) => ({
      note_globale: 3,
      created_at: new Date(matchDate.getTime() + (200 + i * 60) * 60 * 1000),
    }))
    const result = detectVoteAnomalies([...earlyVotes, ...laterVotes], matchDate)
    expect(result.details.earlyVotesPercentage).toBeCloseTo(70)
    expect(result.reasons.some((r) => r.includes("immédiatement après l'ouverture"))).toBe(true)
  })

  it('does not compute earlyVotesPercentage when no matchDate is provided', () => {
    const result = detectVoteAnomalies(spreadVotes(6, 3, 60))
    expect(result.details.earlyVotesPercentage).toBeUndefined()
  })

  it('marks a vote set as suspicious once combined signals cross the 0.5 threshold', () => {
    // 5 identical extreme votes clustered within a few minutes: extreme (+0.4) + grouping (+0.3).
    const votes: VoteData[] = Array.from({ length: 5 }, (_, i) => ({
      note_globale: 5,
      created_at: new Date(BASE.getTime() + i * 60 * 1000),
    }))
    const result = detectVoteAnomalies(votes)
    expect(result.isSuspicious).toBe(true)
    expect(result.confidence).toBeCloseTo(0.7)
  })

  it('caps confidence at 1 even when several signals stack up', () => {
    const matchDate = BASE
    const votes: VoteData[] = Array.from({ length: 10 }, (_, i) => ({
      note_globale: 5,
      created_at: new Date(matchDate.getTime() + (30 * 60 + i * 5) * 1000),
    }))
    const result = detectVoteAnomalies(votes, matchDate)
    expect(result.confidence).toBeLessThanOrEqual(1)
    expect(result.isSuspicious).toBe(true)
  })
})

describe('calculateVoteCredibility', () => {
  it('returns full credibility (100) when there is no anomaly', () => {
    expect(calculateVoteCredibility(spreadVotes(4, 3))).toBe(100)
  })

  it('reduces credibility proportionally to the suspicion confidence', () => {
    const votes: VoteData[] = Array.from({ length: 5 }, (_, i) => ({
      note_globale: 5,
      created_at: new Date(BASE.getTime() + i * 60 * 1000),
    }))
    const credibility = calculateVoteCredibility(votes)
    expect(credibility).toBeCloseTo(30) // 100 - 0.7*100
  })

  it('never goes below 0', () => {
    const matchDate = BASE
    const votes: VoteData[] = Array.from({ length: 10 }, (_, i) => ({
      note_globale: 5,
      created_at: new Date(matchDate.getTime() + (30 * 60 + i * 5) * 1000),
    }))
    expect(calculateVoteCredibility(votes, matchDate)).toBeGreaterThanOrEqual(0)
  })
})
