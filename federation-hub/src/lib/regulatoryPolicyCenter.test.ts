import { describe, expect, it } from 'vitest'
import { resolvePolicy, type PolicyRecord } from '../../../packages/domain-contracts/src/policy'
import {
  assertCommissionDecisionRequiredPure,
  assertOperationDelegatedPure,
  assertSubmissionSatisfiesSignature,
  REGULATORY_POLICY_DEFAULTS,
  sanitizeRegulatoryPolicyValues,
  type RegulatoryPolicyValues,
} from './regulatoryPolicyCenter'

describe('regulatory policy center — sanitization (FED-001/002/003)', () => {
  it('accepts a partial, well-typed patch and coerces booleans/arrays', () => {
    expect(sanitizeRegulatoryPolicyValues({ commissionRequiredForDiscipline: 1, delegatedOperations: ['insurance.review', 'insurance.review'] }))
      .toEqual({ commissionRequiredForDiscipline: true, delegatedOperations: ['insurance.review'] })
  })

  it('rejects unknown keys instead of silently ignoring them', () => {
    expect(() => sanitizeRegulatoryPolicyValues({ notAPolicyKey: true })).toThrow(/inconnue/i)
  })

  it('rejects a non-delegatable operation key', () => {
    expect(() => sanitizeRegulatoryPolicyValues({ delegatedOperations: ['season_cycle.manage'] })).toThrow(/non délégable/i)
  })

  it('rejects an empty patch', () => {
    expect(() => sanitizeRegulatoryPolicyValues({})).toThrow()
  })

  it('rejects a non-object payload', () => {
    expect(() => sanitizeRegulatoryPolicyValues(null)).toThrow()
    expect(() => sanitizeRegulatoryPolicyValues('x')).toThrow()
  })
})

describe('regulatory policy center — délégation fédération -> ligue (FED-004)', () => {
  it('never restricts FEDERATION_ADMIN or platform roles', () => {
    expect(() => assertOperationDelegatedPure('FEDERATION_ADMIN', 'league-1', [], 'insurance.review')).not.toThrow()
    expect(() => assertOperationDelegatedPure('PLATFORM_SUPERADMIN', 'league-1', [], 'grant.review')).not.toThrow()
  })

  it('allows a league-scoped operation with no leagueId (federation-level record)', () => {
    expect(() => assertOperationDelegatedPure('LEAGUE_ADMIN', null, [], 'insurance.review')).not.toThrow()
  })

  it('blocks a LEAGUE_ADMIN operation that was never delegated', () => {
    expect(() => assertOperationDelegatedPure('LEAGUE_ADMIN', 'league-1', ['grant.review'], 'insurance.review')).toThrow(/n'a pas été déléguée/)
  })

  it('allows a LEAGUE_ADMIN operation once explicitly delegated', () => {
    expect(() => assertOperationDelegatedPure('LEAGUE_ADMIN', 'league-1', ['insurance.review'], 'insurance.review')).not.toThrow()
  })
})

describe('regulatory policy center — commission obligatoire (FED-005)', () => {
  it('never blocks when the policy does not require a commission decision', () => {
    expect(() => assertCommissionDecisionRequiredPure(false, false, 'Discipline')).not.toThrow()
  })

  it('blocks a decision when required but no signed commission decision exists', () => {
    expect(() => assertCommissionDecisionRequiredPure(true, false, 'Discipline')).toThrow(/décision de commission signée/i)
  })

  it('allows the decision once a signed commission decision exists', () => {
    expect(() => assertCommissionDecisionRequiredPure(true, true, 'Discipline')).not.toThrow()
  })
})

describe('regulatory policy center — signature documentaire (FED-003)', () => {
  it('allows validation when no signature is required', () => {
    expect(() => assertSubmissionSatisfiesSignature(false, null)).not.toThrow()
  })

  it('blocks validation when a signature is required but missing', () => {
    expect(() => assertSubmissionSatisfiesSignature(true, null)).toThrow(/signature/i)
  })

  it('allows validation once signed', () => {
    expect(() => assertSubmissionSatisfiesSignature(true, new Date())).not.toThrow()
  })
})

describe('regulatory policy center — résolution hiérarchique réelle (FED-001, GOV-001)', () => {
  it('applies FEDERATION then LEAGUE then SEASON in precedence order and reports provenance', () => {
    const records: Array<PolicyRecord<RegulatoryPolicyValues>> = [
      { id: 'fed', scopeType: 'FEDERATION', scopeId: 'fed-1', version: 1, values: { commissionRequiredForDiscipline: true, delegatedOperations: ['insurance.review'] } },
      { id: 'league', scopeType: 'LEAGUE', scopeId: 'league-1', version: 1, values: { delegatedOperations: ['insurance.review', 'grant.review'] } },
      { id: 'season-old', scopeType: 'SEASON', scopeId: 'season-1', version: 1, values: { commissionRequiredForAppeals: true } },
      { id: 'season-new', scopeType: 'SEASON', scopeId: 'season-1', version: 2, values: { commissionRequiredForAppeals: false } },
    ]
    const resolved = resolvePolicy(REGULATORY_POLICY_DEFAULTS, records, { federationId: 'fed-1', leagueId: 'league-1', seasonId: 'season-1', competitionId: 'season-1' })

    expect(resolved.values.commissionRequiredForDiscipline).toBe(true)
    expect(resolved.values.delegatedOperations).toEqual(['insurance.review', 'grant.review'])
    expect(resolved.values.commissionRequiredForAppeals).toBe(false)
    expect(resolved.sources.delegatedOperations).toMatchObject({ kind: 'POLICY', scopeType: 'LEAGUE', recordId: 'league' })
    expect(resolved.sources.commissionRequiredForAppeals).toMatchObject({ kind: 'POLICY', scopeType: 'SEASON', version: 2, recordId: 'season-new' })
    expect(resolved.values.commissionRequiredForClubLicensing).toBe(false)
    expect(resolved.sources.commissionRequiredForClubLicensing).toEqual({ kind: 'DEFAULT' })
  })

  it('ignores records outside the requested scope (tenant isolation)', () => {
    const records: Array<PolicyRecord<RegulatoryPolicyValues>> = [
      { id: 'other-fed', scopeType: 'FEDERATION', scopeId: 'fed-2', version: 1, values: { commissionRequiredForDiscipline: true } },
    ]
    const resolved = resolvePolicy(REGULATORY_POLICY_DEFAULTS, records, { federationId: 'fed-1' })
    expect(resolved.values).toEqual(REGULATORY_POLICY_DEFAULTS)
  })
})
