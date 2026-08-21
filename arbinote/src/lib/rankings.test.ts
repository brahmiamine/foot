import { describe, expect, it } from 'vitest'
import { buildRanking } from './rankings'
import type { Vote } from '@/types'

const arbitre1 = { id: 'a1', nom: 'Jean Dupont', nom_en: null, nom_ar: null, photo_url: null }
const arbitre2 = { id: 'a2', nom: 'Ali Ben', nom_en: null, nom_ar: null, photo_url: null }

function vote(arbitre: typeof arbitre1, note: number): Vote {
  return {
    id: `v-${arbitre.id}-${Math.random()}`,
    match_id: 'm1',
    arbitre_id: arbitre.id,
    criteres: {},
    note_globale: note,
    arbitre: arbitre as Vote['arbitre'],
  }
}

describe('buildRanking', () => {
  it('includes every arbitre with at least one vote by default', () => {
    const ranking = buildRanking([vote(arbitre1, 5), vote(arbitre2, 4)])
    expect(ranking).toHaveLength(2)
  })

  it('excludes an arbitre below the configured minVotes threshold (ARBI-002)', () => {
    const ranking = buildRanking(
      [vote(arbitre1, 5), vote(arbitre2, 4), vote(arbitre2, 4)],
      { minVotes: 2 },
    )
    expect(ranking.map((entry) => entry.arbitreId)).toEqual(['a2'])
  })
})
