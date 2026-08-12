import { describe, expect, it } from 'vitest'
import { canVoteMatch } from './utils'

const ARBITRE_ID = 'arbitre-1'

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

/**
 * US-01 : canVoteMatch doit s'appuyer sur le statut réel du match
 * (matches.status, matches.actual_started_at), pas sur la date programmée —
 * voir avancement.md.
 */
describe('canVoteMatch', () => {
  it('refuse si aucun arbitre n\'est attribué', () => {
    expect(
      canVoteMatch({ arbitre_id: null, status: 'IN_PROGRESS', actual_started_at: minutesAgo(60) })
    ).toBe(false)
  })

  it('refuse un match UPCOMING même si la date programmée est passée', () => {
    expect(
      canVoteMatch({ arbitre_id: ARBITRE_ID, status: 'UPCOMING', actual_started_at: null })
    ).toBe(false)
  })

  it('refuse un match CANCELLED', () => {
    expect(
      canVoteMatch({ arbitre_id: ARBITRE_ID, status: 'CANCELLED', actual_started_at: null })
    ).toBe(false)
  })

  it('refuse un match IN_PROGRESS depuis moins de 30 minutes', () => {
    expect(
      canVoteMatch({ arbitre_id: ARBITRE_ID, status: 'IN_PROGRESS', actual_started_at: minutesAgo(10) })
    ).toBe(false)
  })

  it('autorise un match IN_PROGRESS depuis au moins 30 minutes', () => {
    expect(
      canVoteMatch({ arbitre_id: ARBITRE_ID, status: 'IN_PROGRESS', actual_started_at: minutesAgo(30) })
    ).toBe(true)
    expect(
      canVoteMatch({ arbitre_id: ARBITRE_ID, status: 'IN_PROGRESS', actual_started_at: minutesAgo(45) })
    ).toBe(true)
  })

  it('autorise un match FINISHED avec actual_started_at ancien de plus de 30 minutes', () => {
    expect(
      canVoteMatch({ arbitre_id: ARBITRE_ID, status: 'FINISHED', actual_started_at: minutesAgo(120) })
    ).toBe(true)
  })

  it('autorise un match FINISHED même sans actual_started_at connu (données historiques)', () => {
    expect(
      canVoteMatch({ arbitre_id: ARBITRE_ID, status: 'FINISHED', actual_started_at: null })
    ).toBe(true)
  })

  it('refuse un match IN_PROGRESS sans actual_started_at connu', () => {
    expect(
      canVoteMatch({ arbitre_id: ARBITRE_ID, status: 'IN_PROGRESS', actual_started_at: null })
    ).toBe(false)
  })

  it('refuse quand le statut est absent', () => {
    expect(
      canVoteMatch({ arbitre_id: ARBITRE_ID, status: undefined, actual_started_at: minutesAgo(60) })
    ).toBe(false)
  })
})
