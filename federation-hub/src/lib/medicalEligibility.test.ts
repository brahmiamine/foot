import { describe, expect, it } from 'vitest'
import { assertMedicalEligibilityTransition, isMedicallyEligible } from '../../../packages/regulatory-shared/src/medicalEligibility'
describe('medical eligibility workflow', () => {
  it('decides a pending case as FIT or UNFIT', () => {
    expect(() => assertMedicalEligibilityTransition('PENDING', 'FIT')).not.toThrow()
    expect(() => assertMedicalEligibilityTransition('PENDING', 'UNFIT')).not.toThrow()
  })
  it('lets an unfit player be re-examined, but never re-declared fit directly', () => {
    expect(() => assertMedicalEligibilityTransition('UNFIT', 'PENDING')).not.toThrow()
    expect(() => assertMedicalEligibilityTransition('UNFIT', 'FIT')).toThrow()
  })
  it('makes EXPIRED terminal and lets SUSPENDED be reinstated', () => {
    expect(() => assertMedicalEligibilityTransition('EXPIRED', 'FIT')).toThrow()
    expect(() => assertMedicalEligibilityTransition('SUSPENDED', 'FIT')).not.toThrow()
  })
  it('is only eligible while FIT and not expired, never leaks a diagnostic', () => {
    const now = new Date('2026-08-14')
    expect(isMedicallyEligible('FIT', '2027-01-01', now)).toBe(true)
    expect(isMedicallyEligible('FIT', '2020-01-01', now)).toBe(false)
    expect(isMedicallyEligible('UNFIT', null, now)).toBe(false)
    expect(isMedicallyEligible('PENDING', null, now)).toBe(false)
  })
})
