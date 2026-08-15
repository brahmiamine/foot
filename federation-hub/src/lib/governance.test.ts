import { describe, expect, it } from 'vitest'
import { assertBoardMandateTransition, canEditBoardMandate, isMandateInEffect } from '../../../packages/regulatory-shared/src/governance'
describe('board mandate workflow', () => {
  it('requires submission before validation or rejection', () => {
    expect(() => assertBoardMandateTransition('DRAFT', 'VALIDATED')).toThrow()
    expect(() => assertBoardMandateTransition('SUBMITTED', 'VALIDATED')).not.toThrow()
    expect(() => assertBoardMandateTransition('SUBMITTED', 'REJECTED')).not.toThrow()
  })
  it('lets a rejected mandate be corrected and resubmitted', () => {
    expect(() => assertBoardMandateTransition('REJECTED', 'DRAFT')).not.toThrow()
  })
  it('only DRAFT and REJECTED mandates accept edits', () => {
    expect(canEditBoardMandate('DRAFT')).toBe(true)
    expect(canEditBoardMandate('REJECTED')).toBe(true)
    expect(canEditBoardMandate('VALIDATED')).toBe(false)
  })
  it('is only in effect while VALIDATED and within its date window', () => {
    const now = new Date('2026-08-14')
    expect(isMandateInEffect('VALIDATED', '2026-01-01', '2030-01-01', now)).toBe(true)
    expect(isMandateInEffect('SUBMITTED', '2026-01-01', '2030-01-01', now)).toBe(false)
    expect(isMandateInEffect('VALIDATED', '2027-01-01', '2030-01-01', now)).toBe(false)
  })
})
