import { describe, expect, it } from 'vitest'
import { assertCoachQualificationTransition, isCoachQualificationActive, meetsMinimumQualification } from '../../../packages/regulatory-shared/src/coachQualification'
describe('coach qualification workflow', () => {
  it('validates or revokes a pending request', () => {
    expect(() => assertCoachQualificationTransition('PENDING', 'VALID')).not.toThrow()
    expect(() => assertCoachQualificationTransition('PENDING', 'REVOKED')).not.toThrow()
    expect(() => assertCoachQualificationTransition('PENDING', 'SUSPENDED')).toThrow()
  })
  it('makes EXPIRED and REVOKED terminal', () => {
    expect(() => assertCoachQualificationTransition('EXPIRED', 'VALID')).toThrow()
    expect(() => assertCoachQualificationTransition('REVOKED', 'VALID')).toThrow()
  })
  it('lets a suspended qualification be reinstated or revoked', () => {
    expect(() => assertCoachQualificationTransition('SUSPENDED', 'VALID')).not.toThrow()
    expect(() => assertCoachQualificationTransition('SUSPENDED', 'REVOKED')).not.toThrow()
  })
  it('is only active while VALID and not expired', () => {
    const now = new Date('2026-08-14')
    expect(isCoachQualificationActive('VALID', '2027-01-01', now)).toBe(true)
    expect(isCoachQualificationActive('VALID', '2020-01-01', now)).toBe(false)
    expect(isCoachQualificationActive('PENDING', null, now)).toBe(false)
  })
  it('ranks CAF levels from OTHER/NATIONAL up to CAF_PRO', () => {
    expect(meetsMinimumQualification('CAF_PRO', 'CAF_A')).toBe(true)
    expect(meetsMinimumQualification('CAF_C', 'CAF_A')).toBe(false)
    expect(meetsMinimumQualification('CAF_A', 'CAF_A')).toBe(true)
  })
})
