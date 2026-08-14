import { describe, expect, it } from 'vitest'
import { assertStaffContractDates, assertStaffContractFederalTransition, assertStaffContractSubmittable, isStaffContractEligible } from '../../../packages/regulatory-shared/src/staffContract'
describe('federal staff contract rules', () => {
  it('requires review before approval', () => { expect(() => assertStaffContractFederalTransition('SUBMITTED', 'APPROVED')).toThrow(); expect(() => assertStaffContractFederalTransition('SUBMITTED', 'UNDER_REVIEW')).not.toThrow(); expect(() => assertStaffContractFederalTransition('UNDER_REVIEW', 'APPROVED')).not.toThrow() })
  it('allows rejected contracts to return for corrections', () => { expect(() => assertStaffContractFederalTransition('REJECTED', 'NOT_SUBMITTED')).not.toThrow() })
  it('requires signature and a current document', () => { expect(() => assertStaffContractSubmittable('SIGNED', true)).not.toThrow(); expect(() => assertStaffContractSubmittable('SIGNED', false)).toThrow() })
  it('blocks incoherent dates', () => { expect(() => assertStaffContractDates('2027-01-01', '2026-12-31')).toThrow() })
  it('projects technical eligibility from contract and qualification', () => { const base = { status: 'SIGNED' as const, federalStatus: 'APPROVED' as const, endDate: '2027-12-31', requiresQualification: true }; expect(isStaffContractEligible({ ...base, qualificationStatus: 'APPROVED', qualificationExpiresAt: '2027-12-31' }, new Date('2026-08-14'))).toBe(true); expect(isStaffContractEligible({ ...base, qualificationStatus: 'EXPIRED', qualificationExpiresAt: '2026-01-01' }, new Date('2026-08-14'))).toBe(false) })
})
