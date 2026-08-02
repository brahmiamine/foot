import { describe, expect, it } from 'vitest'
import {
  calculateEffectiveVoteCount,
  calculateVoteWeight,
  calculateWeightedAverage,
} from './voteWeighting'

const BASE = new Date('2026-01-10T20:00:00Z')

function spread(notes: number[], spacingMinutes = 60) {
  return notes.map((note, i) => ({
    note_globale: note,
    created_at: new Date(BASE.getTime() + i * spacingMinutes * 60 * 1000),
  }))
}

describe('calculateVoteWeight', () => {
  it('returns full weight when the match has fewer than 5 votes', () => {
    const result = calculateVoteWeight(
      { note_globale: 5 },
      spread([3, 3, 3])
    )
    expect(result).toEqual({ weight: 1.0 })
  })

  it('reduces the weight of a vote that is an isolated statistical outlier', () => {
    const allVotes = spread([3, 3, 3, 3, 3, 3, 3, 3, 3, 4]) // mean 3.1, stdDev 0.3
    const result = calculateVoteWeight({ note_globale: 5 }, allVotes)
    expect(result.weight).toBeLessThan(1.0)
    expect(result.reason).toMatch(/Vote extrême isolé/)
  })

  it('does not penalize a vote close to the mean', () => {
    const allVotes = spread([3, 3, 3, 3, 3, 3, 3, 3, 3, 4])
    const result = calculateVoteWeight({ note_globale: 3 }, allVotes)
    // 3 is close to the mean (3.1) and within the "moderate" bonus range.
    expect(result.reason).toBeUndefined()
    expect(result.weight).toBe(1.0)
  })

  it('reduces weight for a vote belonging to a suspicious pattern', () => {
    // 5 identical extreme votes clustered together are flagged suspicious
    // (see voteAnomalyDetection tests) - use them as match context.
    const allVotes = spread([5, 5, 5, 5, 5], 1)
    // A moderate vote, far away in time so it doesn't also fall in the
    // suspicious clustering window (keeps this test isolated to the
    // "suspicious pattern" reduction only).
    const target = {
      note_globale: 3,
      created_at: new Date(BASE.getTime() + 10 * 24 * 60 * 60 * 1000),
    }
    const result = calculateVoteWeight(target, allVotes)
    expect(result.weight).toBeLessThan(1.0)
    expect(result.reason).toMatch(/Pattern suspect détecté/)
  })

  it('applies an extra penalty when an extreme vote sits inside a suspicious pattern', () => {
    const allVotes = spread([5, 5, 5, 5, 5], 1)
    const moderateTarget = {
      note_globale: 3,
      created_at: new Date(BASE.getTime() + 10 * 24 * 60 * 60 * 1000),
    }
    const extremeTarget = {
      note_globale: 5,
      created_at: new Date(BASE.getTime() + 10 * 24 * 60 * 60 * 1000),
    }
    const moderateResult = calculateVoteWeight(moderateTarget, allVotes)
    const extremeResult = calculateVoteWeight(extremeTarget, allVotes)
    expect(extremeResult.reason).toMatch(/Vote extrême dans pattern suspect/)
    expect(extremeResult.weight).toBeLessThan(moderateResult.weight)
  })

  it('reduces weight for a vote inside the suspicious time-grouping window', () => {
    const allVotes = spread([5, 5, 5, 5, 5], 1) // clustered, 1 minute apart
    // This vote lands inside the same clustered window as allVotes.
    const target = { note_globale: 3, created_at: new Date(BASE.getTime() + 2 * 60 * 1000) }
    const result = calculateVoteWeight(target, allVotes)
    expect(result.reason).toMatch(/fenêtre de groupement temporel/)
  })

  it('slightly reduces weight for a vote cast very soon after match opening', () => {
    const allVotes = spread([3, 3, 3, 3, 3, 3, 3, 3, 3, 4])
    const target = {
      note_globale: 3,
      created_at: new Date(BASE.getTime() + 31 * 60 * 1000), // 31 minutes after kickoff
    }
    const result = calculateVoteWeight(target, allVotes, BASE)
    expect(result.reason).toMatch(/Vote très rapide après ouverture/)
    expect(result.weight).toBeLessThan(1.0)
  })

  it('gives a moderate-note bonus that is capped at 1.0', () => {
    const allVotes = spread([3, 3, 3, 3, 3, 3, 3, 3, 3, 3])
    const result = calculateVoteWeight({ note_globale: 3.5 }, allVotes)
    expect(result.weight).toBe(1.0)
  })

  it('keeps the final weight within [0.1, 1.0]', () => {
    const allVotes = spread([5, 5, 5, 5, 5], 1)
    const target = { note_globale: 5, created_at: new Date(BASE.getTime() + 2 * 60 * 1000) }
    const result = calculateVoteWeight(target, allVotes, BASE)
    expect(result.weight).toBeGreaterThanOrEqual(0.1)
    expect(result.weight).toBeLessThanOrEqual(1.0)
  })

  it('accepts a precomputed anomaly instead of recomputing it', () => {
    const allVotes = spread([5, 5, 5, 5, 5], 1)
    const target = {
      note_globale: 3,
      created_at: new Date(BASE.getTime() + 10 * 24 * 60 * 60 * 1000),
    }
    const notSuspicious = { isSuspicious: false, confidence: 0, reasons: [], details: {} }
    const result = calculateVoteWeight(target, allVotes, undefined, notSuspicious)
    // With a forced "not suspicious" precomputed result, the pattern penalty must not apply.
    expect(result.reason).toBeUndefined()
    expect(result.weight).toBe(1.0)
  })
})

describe('calculateWeightedAverage', () => {
  it('returns 0 for an empty vote list', () => {
    expect(calculateWeightedAverage([])).toBe(0)
  })

  it('computes the weighted mean', () => {
    const avg = calculateWeightedAverage([
      { note_globale: 5, weight: 1 },
      { note_globale: 1, weight: 0.5 },
    ])
    expect(avg).toBeCloseTo((5 * 1 + 1 * 0.5) / 1.5)
  })

  it('ignores invalid or non-positive notes', () => {
    const avg = calculateWeightedAverage([
      { note_globale: 4, weight: 1 },
      { note_globale: 0, weight: 1 },
      { note_globale: NaN, weight: 1 },
    ])
    expect(avg).toBe(4)
  })

  it('returns 0 when the total weight is 0', () => {
    expect(calculateWeightedAverage([{ note_globale: 5, weight: 0 }])).toBe(0)
  })
})

describe('calculateEffectiveVoteCount', () => {
  it('sums the weights of all votes', () => {
    expect(calculateEffectiveVoteCount([{ weight: 1 }, { weight: 0.5 }, { weight: 0.25 }])).toBeCloseTo(1.75)
  })

  it('returns 0 for an empty list', () => {
    expect(calculateEffectiveVoteCount([])).toBe(0)
  })
})
