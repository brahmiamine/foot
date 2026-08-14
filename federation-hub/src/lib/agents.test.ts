import { describe, expect, it } from 'vitest'
import { assertFootballAgentTransition, assertRepresentationAgreementTransition, isFootballAgentActive } from '../../../packages/regulatory-shared/src/agents'
describe('football agent workflow', () => {
  it('activates or revokes a pending agent', () => {
    expect(() => assertFootballAgentTransition('PENDING', 'ACTIVE')).not.toThrow()
    expect(() => assertFootballAgentTransition('PENDING', 'REVOKED')).not.toThrow()
    expect(() => assertFootballAgentTransition('PENDING', 'SUSPENDED')).toThrow()
  })
  it('makes REVOKED and EXPIRED terminal', () => {
    expect(() => assertFootballAgentTransition('REVOKED', 'ACTIVE')).toThrow()
    expect(() => assertFootballAgentTransition('EXPIRED', 'ACTIVE')).toThrow()
  })
  it('is only active while ACTIVE and not past validUntil', () => {
    const now = new Date('2026-08-14')
    expect(isFootballAgentActive('ACTIVE', '2027-01-01', now)).toBe(true)
    expect(isFootballAgentActive('ACTIVE', '2020-01-01', now)).toBe(false)
    expect(isFootballAgentActive('SUSPENDED', null, now)).toBe(false)
  })
})
describe('representation agreement workflow', () => {
  it('activates or terminates a draft agreement', () => {
    expect(() => assertRepresentationAgreementTransition('DRAFT', 'ACTIVE')).not.toThrow()
    expect(() => assertRepresentationAgreementTransition('DRAFT', 'TERMINATED')).not.toThrow()
  })
  it('makes TERMINATED and EXPIRED terminal', () => {
    expect(() => assertRepresentationAgreementTransition('TERMINATED', 'ACTIVE')).toThrow()
    expect(() => assertRepresentationAgreementTransition('EXPIRED', 'ACTIVE')).toThrow()
  })
})
