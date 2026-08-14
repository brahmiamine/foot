import { describe, expect, it } from 'vitest'
import {
  buildBayesianRanking,
  computeBayesianRating,
  computeRankingFromVotes,
  DEFAULT_BAYESIAN_C,
  DEFAULT_BAYESIAN_M,
} from './bayesianRanking'

describe('computeBayesianRating', () => {
  it('returns the site average when there are no votes', () => {
    expect(computeBayesianRating(0, 0)).toBe(DEFAULT_BAYESIAN_M)
    expect(computeBayesianRating(5, 0, 4, 10)).toBe(4)
  })

  it('applies the bayesian smoothing formula', () => {
    // (m*C + moyenne*n) / (n + C)
    const result = computeBayesianRating(4.5, 10, 3.8, 20)
    const expected = (3.8 * 20 + 4.5 * 10) / (10 + 20)
    expect(result).toBe(Math.round(expected * 100) / 100)
  })

  it('converges toward the raw average as vote count grows relative to C', () => {
    const fewVotes = computeBayesianRating(5, 1, 3.8, 20)
    const manyVotes = computeBayesianRating(5, 1000, 3.8, 20)
    // With very few votes, the score stays close to the site mean.
    expect(fewVotes).toBeLessThan(manyVotes)
    // With overwhelming votes, the score approaches the raw average.
    expect(manyVotes).toBeCloseTo(5, 1)
  })

  it('rounds to 2 decimal places', () => {
    const result = computeBayesianRating(4.333333, 7, 3.8, 20)
    expect(result).toBe(Math.round(result * 100) / 100)
  })

  it('throws when the vote count is negative', () => {
    expect(() => computeBayesianRating(4, -1)).toThrow(
      'Le nombre de votes ne peut pas être négatif'
    )
  })

  it('uses the module defaults when m/C are omitted', () => {
    expect(computeBayesianRating(4, 0)).toBe(DEFAULT_BAYESIAN_M)
    expect(computeBayesianRating(4, DEFAULT_BAYESIAN_C)).toBe(
      computeBayesianRating(4, DEFAULT_BAYESIAN_C, DEFAULT_BAYESIAN_M, DEFAULT_BAYESIAN_C)
    )
  })
})

describe('computeRankingFromVotes', () => {
  it('groups votes by arbitre_id and computes bayesian scores', () => {
    const ranking = computeRankingFromVotes([
      { arbitre_id: 'a1', note_globale: 5 },
      { arbitre_id: 'a1', note_globale: 4 },
      { arbitre_id: 'a2', note_globale: 3 },
    ])

    expect(ranking).toHaveLength(2)
    const a1 = ranking.find((r) => r.arbitre_id === 'a1')!
    expect(a1.nb_votes).toBe(2)
    expect(a1.moyenne_brute).toBe(4.5)
    expect(a1.note_bayesienne).toBe(computeBayesianRating(4.5, 2))
  })

  it('sorts by bayesian score descending, tie-broken by vote count', () => {
    const ranking = computeRankingFromVotes([
      { arbitre_id: 'low', note_globale: 3 },
      { arbitre_id: 'high', note_globale: 5 },
      { arbitre_id: 'high', note_globale: 5 },
    ])
    expect(ranking[0].arbitre_id).toBe('high')
    expect(ranking[1].arbitre_id).toBe('low')
  })

  it('ignores votes with a non-numeric note_globale', () => {
    const ranking = computeRankingFromVotes([
      { arbitre_id: 'a1', note_globale: 5 },
      { arbitre_id: 'a1', note_globale: NaN },
    ])
    expect(ranking).toHaveLength(1)
    expect(ranking[0].nb_votes).toBe(1)
    expect(ranking[0].moyenne_brute).toBe(5)
  })

  it('applies vote weights to the raw average and effective vote count', () => {
    const ranking = computeRankingFromVotes([
      { arbitre_id: 'a1', note_globale: 5, weight: 1 },
      { arbitre_id: 'a1', note_globale: 1, weight: 0.1 },
    ])
    const a1 = ranking[0]
    // Weighted average: (5*1 + 1*0.1) / (1 + 0.1)
    const expectedAvg = (5 * 1 + 1 * 0.1) / 1.1
    expect(a1.moyenne_brute).toBe(Math.round(expectedAvg * 100) / 100)
    // Real vote count stays 2 even though effective (weighted) weight is 1.1.
    expect(a1.nb_votes).toBe(2)
  })

  it('defaults weight to 1.0 when not specified', () => {
    const withWeight = computeRankingFromVotes([{ arbitre_id: 'a1', note_globale: 4, weight: 1 }])
    const withoutWeight = computeRankingFromVotes([{ arbitre_id: 'a1', note_globale: 4 }])
    expect(withWeight[0].moyenne_brute).toBe(withoutWeight[0].moyenne_brute)
    expect(withWeight[0].note_bayesienne).toBe(withoutWeight[0].note_bayesienne)
  })

  it('returns an empty array for no votes', () => {
    expect(computeRankingFromVotes([])).toEqual([])
  })
})

describe('buildBayesianRanking', () => {
  const arbitre1 = { id: 'a1', nom: 'Jean Dupont', nom_en: null, nom_ar: null, photo_url: null }
  const arbitre2 = { id: 'a2', nom: 'Ali Ben', nom_en: null, nom_ar: null, photo_url: null }

  it('ignores votes without an attached arbitre', () => {
    const ranking = buildBayesianRanking([
      { arbitre: null, note_globale: 5 },
      { arbitre: arbitre1, note_globale: 4 },
    ])
    expect(ranking).toHaveLength(1)
    expect(ranking[0].arbitreId).toBe('a1')
  })

  it('computes weighted averages and bayesian scores per arbitre', () => {
    const ranking = buildBayesianRanking([
      { arbitre: arbitre1, note_globale: 5 },
      { arbitre: arbitre1, note_globale: 3 },
      { arbitre: arbitre2, note_globale: 4 },
    ])

    const a1 = ranking.find((r) => r.arbitreId === 'a1')!
    expect(a1.votes).toBe(2)
    expect(a1.moyenne).toBe(4)
    expect(a1.moyenne_bayesienne).toBe(computeBayesianRating(4, 2))
  })

  it('sorts by bayesian score descending, tie-broken by vote count', () => {
    const ranking = buildBayesianRanking([
      { arbitre: arbitre1, note_globale: 3 },
      { arbitre: arbitre2, note_globale: 5 },
      { arbitre: arbitre2, note_globale: 5 },
    ])
    expect(ranking[0].arbitreId).toBe('a2')
    expect(ranking[1].arbitreId).toBe('a1')
  })

  it('backfills missing nom_en/nom_ar/photo_url from later votes', () => {
    const ranking = buildBayesianRanking([
      { arbitre: { ...arbitre1, nom_en: null, photo_url: null }, note_globale: 5 },
      { arbitre: { ...arbitre1, nom_en: 'John Doe', photo_url: 'https://x/y.png' }, note_globale: 4 },
    ])
    expect(ranking[0].nom_en).toBe('John Doe')
    expect(ranking[0].photo_url).toBe('https://x/y.png')
  })

  it('averages criteres per key, filtered by includeCategories when provided', () => {
    const ranking = buildBayesianRanking(
      [
        { arbitre: arbitre1, note_globale: 5, criteres: { c1: 4, c2: 2 } },
        { arbitre: arbitre1, note_globale: 3, criteres: { c1: 2, c2: 5 } },
      ],
      {
        criteres: [
          { id: 'c1', categorie: 'arbitre' },
          { id: 'c2', categorie: 'var' },
        ],
        includeCategories: ['arbitre'],
      }
    )

    expect(ranking[0].criteres).toEqual({ c1: 3 })
  })

  it('returns an empty criteres object when votes carry no critere values', () => {
    const ranking = buildBayesianRanking(
      [{ arbitre: arbitre1, note_globale: 5, criteres: {} }],
      { criteres: [{ id: 'c1', categorie: 'arbitre' }] }
    )
    expect(ranking[0].criteres).toEqual({})
  })

  it('returns an empty array when no votes have an arbitre', () => {
    expect(buildBayesianRanking([{ arbitre: null, note_globale: 5 }])).toEqual([])
  })
})
