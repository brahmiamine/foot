import { describe, expect, it } from 'vitest'
import {
  assertAllocationDoesNotExceed,
  assertAllocationMatchesTotal,
  assertCommissionDecisionAllowed,
  assertCommissionSessionTransition,
  assertDateRange,
  assertDecisionMutable,
  assertValidSlaThresholds,
  calculateRequiredQuorum,
  computeAggregateCaseStatus,
  computeRegulatorySlaState,
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

  it('agrège le statut du dossier depuis les bénéficiaires (FED-009)', () => {
    expect(computeAggregateCaseStatus(['APPROVED', 'APPROVED'])).toBe('DECIDED')
    expect(computeAggregateCaseStatus(['PAID', 'PAID'])).toBe('PAID')
    expect(computeAggregateCaseStatus(['PAID', 'APPROVED'])).toBe('DECIDED')
    expect(computeAggregateCaseStatus(['PAID', 'DISPUTED'])).toBe('DISPUTED')
    expect(computeAggregateCaseStatus([])).toBe('DECIDED')
  })

  it('calcule l\'état SLA depuis les seuils configurés (FED-010)', () => {
    expect(computeRegulatorySlaState(10, 48, 168)).toBe('IN_SLA')
    expect(computeRegulatorySlaState(48, 48, 168)).toBe('DUE_SOON')
    expect(computeRegulatorySlaState(100, 48, 168)).toBe('DUE_SOON')
    expect(computeRegulatorySlaState(168, 48, 168)).toBe('OVERDUE')
    expect(computeRegulatorySlaState(500, 48, 168)).toBe('OVERDUE')
  })

  it('valide les seuils SLA (positifs, dépassement strictement après alerte)', () => {
    expect(() => assertValidSlaThresholds(48, 168)).not.toThrow()
    expect(() => assertValidSlaThresholds(0, 168)).toThrow()
    expect(() => assertValidSlaThresholds(48, 48)).toThrow()
    expect(() => assertValidSlaThresholds(168, 48)).toThrow()
    expect(() => assertValidSlaThresholds(1.5, 168)).toThrow()
  })
})
