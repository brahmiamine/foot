import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VOTING_POLICY,
  isScorePubliclyVisible,
  resolveVotingEligibility,
  shouldQuarantineForConfidence,
} from './votingPolicy'

const baseMatch = {
  arbitreId: 'arb-1',
  status: 'IN_PROGRESS' as const,
  actualStartedAt: new Date('2026-08-20T18:00:00Z'),
  homeTeamId: 'team-home',
  awayTeamId: 'team-away',
}

const anonymousVoter = { isAuthenticatedMember: false, isClubMember: false, isVerified: false }

describe('resolveVotingEligibility', () => {
  it('rejects a match without a referee', () => {
    const error = resolveVotingEligibility(DEFAULT_VOTING_POLICY, { ...baseMatch, arbitreId: null }, anonymousVoter)
    expect(error).toMatch(/arbitre/)
  })

  it('rejects UPCOMING/CANCELLED matches', () => {
    expect(resolveVotingEligibility(DEFAULT_VOTING_POLICY, { ...baseMatch, status: 'UPCOMING' }, anonymousVoter, new Date('2026-08-20T19:00:00Z'))).toMatch(/ouvert/)
    expect(resolveVotingEligibility(DEFAULT_VOTING_POLICY, { ...baseMatch, status: 'CANCELLED' }, anonymousVoter, new Date('2026-08-20T19:00:00Z'))).toMatch(/ouvert/)
  })

  it('enforces the configurable opening delay', () => {
    const tooSoon = resolveVotingEligibility(DEFAULT_VOTING_POLICY, baseMatch, anonymousVoter, new Date('2026-08-20T18:10:00Z'))
    expect(tooSoon).toMatch(/ouvre/)

    const ok = resolveVotingEligibility(DEFAULT_VOTING_POLICY, baseMatch, anonymousVoter, new Date('2026-08-20T18:35:00Z'))
    expect(ok).toBeNull()
  })

  it('enforces a configurable closing window when set', () => {
    const policy = { ...DEFAULT_VOTING_POLICY, voteCloseHoursAfterMatch: 2 }
    const withinWindow = resolveVotingEligibility(policy, baseMatch, anonymousVoter, new Date('2026-08-20T19:30:00Z'))
    expect(withinWindow).toBeNull()

    const afterClose = resolveVotingEligibility(policy, baseMatch, anonymousVoter, new Date('2026-08-20T21:00:00Z'))
    expect(afterClose).toMatch(/fermé/)
  })

  it('allows anyone in ANONYMOUS mode, member or not', () => {
    const now = new Date('2026-08-20T18:35:00Z')
    expect(resolveVotingEligibility(DEFAULT_VOTING_POLICY, baseMatch, anonymousVoter, now)).toBeNull()
    expect(resolveVotingEligibility(DEFAULT_VOTING_POLICY, baseMatch, { isAuthenticatedMember: true, isClubMember: false, isVerified: false }, now)).toBeNull()
  })

  it('MEMBERS mode requires authenticated club membership', () => {
    const policy = { ...DEFAULT_VOTING_POLICY, votingMode: 'MEMBERS' as const }
    const now = new Date('2026-08-20T18:35:00Z')
    expect(resolveVotingEligibility(policy, baseMatch, anonymousVoter, now)).toMatch(/membres/)
    expect(resolveVotingEligibility(policy, baseMatch, { isAuthenticatedMember: true, isClubMember: false, isVerified: false }, now)).toMatch(/membres/)
    expect(resolveVotingEligibility(policy, baseMatch, { isAuthenticatedMember: true, isClubMember: true, isVerified: false }, now)).toBeNull()
  })

  it('VERIFIED mode requires a recent MFA-verified identity', () => {
    const policy = { ...DEFAULT_VOTING_POLICY, votingMode: 'VERIFIED' as const }
    const now = new Date('2026-08-20T18:35:00Z')
    expect(resolveVotingEligibility(policy, baseMatch, { isAuthenticatedMember: true, isClubMember: false, isVerified: false }, now)).toMatch(/vérifiée/)
    expect(resolveVotingEligibility(policy, baseMatch, { isAuthenticatedMember: true, isClubMember: false, isVerified: true }, now)).toBeNull()
  })
})

describe('isScorePubliclyVisible', () => {
  it('hides the score below the configured minimum', () => {
    expect(isScorePubliclyVisible(2, { minimumVotesBeforeScoreVisible: 5 })).toBe(false)
    expect(isScorePubliclyVisible(5, { minimumVotesBeforeScoreVisible: 5 })).toBe(true)
  })
})

describe('shouldQuarantineForConfidence', () => {
  it('only quarantines above the configured threshold', () => {
    expect(shouldQuarantineForConfidence(0.6, { quarantineConfidenceThreshold: 0.7 })).toBe(false)
    expect(shouldQuarantineForConfidence(0.7, { quarantineConfidenceThreshold: 0.7 })).toBe(true)
  })
})
