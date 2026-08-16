import { describe, expect, it } from 'vitest'
import {
  assertAllocationDoesNotExceed,
  assertAllocationMatchesTotal,
  assertCommissionDecisionAllowed,
  assertCommissionSessionTransition,
  assertDateRange,
  assertDecisionMutable,
  calculateRequiredQuorum,
  computeSolidarityContribution,
} from './federalOperationsRules'

describe('federal operations rules', () => {
  it('calcule le quorum majoritaire et deux tiers', () => {
    expect(calculateRequiredQuorum(5, 'ABSOLUTE_MAJORITY')).toBe(3)
    expect(calculateRequiredQuorum(5, 'TWO_THIRDS')).toBe(4)
    expect(calculateRequiredQuorum(5, 'FIXED', 2)).toBe(2)
  })

  it('interdit une délibération sans quorum', () => {
    expect(() => assertCommissionSessionTransition('IN_SESSION', 'DELIBERATION', false)).toThrow(/quorum/i)
    expect(() => assertCommissionSessionTransition('IN_SESSION', 'DELIBERATION', true)).not.toThrow()
  })

  it('interdit une décision hors délibération ou sans quorum', () => {
    expect(() => assertCommissionDecisionAllowed('IN_SESSION', true)).toThrow()
    expect(() => assertCommissionDecisionAllowed('DELIBERATION', false)).toThrow(/quorum/i)
    expect(() => assertCommissionDecisionAllowed('DELIBERATION', true)).not.toThrow()
  })

  it('rend une décision signée immuable', () => {
    expect(() => assertDecisionMutable(null)).not.toThrow()
    expect(() => assertDecisionMutable(new Date())).toThrow(/immuable/i)
  })

  it('refuse les répartitions financières incohérentes', () => {
    expect(() => assertAllocationDoesNotExceed(100, [40, 61])).toThrow()
    expect(() => assertAllocationDoesNotExceed(100, [40, 60])).not.toThrow()
    expect(() => assertAllocationMatchesTotal(100, [40, 50])).toThrow()
    expect(() => assertAllocationMatchesTotal(100, [40, 60])).not.toThrow()
  })

  it('calcule la contribution de solidarité sans faire confiance au navigateur', () => {
    expect(computeSolidarityContribution(1_000_000, 0.05)).toBe(50_000)
    expect(() => computeSolidarityContribution(1_000_000, 1.1)).toThrow()
  })

  it('valide strictement les périodes réglementaires', () => {
    expect(() => assertDateRange('2027-01-01', '2027-02-01')).not.toThrow()
    expect(() => assertDateRange('2027-02-01', '2027-01-01')).toThrow()
  })
})
