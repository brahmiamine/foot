import { describe, expect, it } from 'vitest'
import { assertFinancialComplianceTransition, canEditFinancialCompliance, isFinanciallyCompliant } from '../../../packages/regulatory-shared/src/financialCompliance'
describe('financial compliance workflow', () => {
  it('requires review before a decision', () => {
    expect(() => assertFinancialComplianceTransition('SUBMITTED', 'COMPLIANT')).toThrow()
    expect(() => assertFinancialComplianceTransition('UNDER_REVIEW', 'COMPLIANT')).not.toThrow()
  })
  it('lets a non-compliant club correct and resubmit a new dossier', () => {
    expect(() => assertFinancialComplianceTransition('NON_COMPLIANT', 'DRAFT')).not.toThrow()
    expect(() => assertFinancialComplianceTransition('COMPLIANT', 'DRAFT')).toThrow()
  })
  it('only DRAFT and NON_COMPLIANT dossiers are editable', () => {
    expect(canEditFinancialCompliance('DRAFT')).toBe(true)
    expect(canEditFinancialCompliance('NON_COMPLIANT')).toBe(true)
    expect(canEditFinancialCompliance('SUBMITTED')).toBe(false)
    expect(canEditFinancialCompliance('COMPLIANT')).toBe(false)
  })
  it('treats CONDITIONAL as compliant (authorized with reservations)', () => {
    expect(isFinanciallyCompliant('COMPLIANT')).toBe(true)
    expect(isFinanciallyCompliant('CONDITIONAL')).toBe(true)
    expect(isFinanciallyCompliant('NON_COMPLIANT')).toBe(false)
  })
})
