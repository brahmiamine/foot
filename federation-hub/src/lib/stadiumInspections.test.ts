import { describe, expect, it } from 'vitest'
import { assertStadiumInspectionTransition, isStadiumApproved } from '../../../packages/regulatory-shared/src/stadiumLicensing'
describe('stadium inspection workflow', () => {
  it('decides a PENDING inspection into approved, restricted or rejected', () => {
    expect(() => assertStadiumInspectionTransition('PENDING', 'APPROVED')).not.toThrow()
    expect(() => assertStadiumInspectionTransition('PENDING', 'APPROVED_WITH_RESTRICTIONS')).not.toThrow()
    expect(() => assertStadiumInspectionTransition('PENDING', 'REJECTED')).not.toThrow()
  })
  it('makes REJECTED and EXPIRED terminal', () => {
    expect(() => assertStadiumInspectionTransition('REJECTED', 'APPROVED')).toThrow()
    expect(() => assertStadiumInspectionTransition('EXPIRED', 'APPROVED')).toThrow()
  })
  it('lets a suspended stadium be reinstated', () => {
    expect(() => assertStadiumInspectionTransition('SUSPENDED', 'APPROVED')).not.toThrow()
    expect(() => assertStadiumInspectionTransition('APPROVED', 'SUSPENDED')).not.toThrow()
  })
  it('treats APPROVED_WITH_RESTRICTIONS as approved, and expiry as blocking', () => {
    expect(isStadiumApproved('APPROVED_WITH_RESTRICTIONS')).toBe(true)
    expect(isStadiumApproved('PENDING')).toBe(false)
    expect(isStadiumApproved('APPROVED', '2020-01-01', new Date('2026-08-14'))).toBe(false)
    expect(isStadiumApproved('APPROVED', '2030-01-01', new Date('2026-08-14'))).toBe(true)
  })
})
