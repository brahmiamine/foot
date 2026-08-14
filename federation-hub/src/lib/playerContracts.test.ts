import { describe, expect, it } from 'vitest'
import { assertPlayerContractDates, assertPlayerContractFederalTransition, assertPlayerContractSubmittable, isPlayerContractHomologated } from '../../../packages/regulatory-shared/src/playerContract'

describe('federal player contract rules', () => {
  it('requires review before approval', () => { expect(() => assertPlayerContractFederalTransition('SUBMITTED', 'APPROVED')).toThrow(); expect(() => assertPlayerContractFederalTransition('SUBMITTED', 'UNDER_REVIEW')).not.toThrow(); expect(() => assertPlayerContractFederalTransition('UNDER_REVIEW', 'APPROVED')).not.toThrow() })
  it('allows a rejected contract to return for corrections', () => { expect(() => assertPlayerContractFederalTransition('REJECTED', 'NOT_SUBMITTED')).not.toThrow() })
  it('requires a signed contract and a current document', () => { expect(() => assertPlayerContractSubmittable('SIGNED', true)).not.toThrow(); expect(() => assertPlayerContractSubmittable('SIGNED', false)).toThrow() })
  it('blocks incoherent dates', () => { expect(() => assertPlayerContractDates('2027-01-01', '2026-12-31')).toThrow() })
  it('projects homologation from status and validity', () => { expect(isPlayerContractHomologated('SIGNED', 'APPROVED', '2027-12-31', new Date('2026-08-14'))).toBe(true); expect(isPlayerContractHomologated('SIGNED', 'REJECTED', '2027-12-31', new Date('2026-08-14'))).toBe(false) })
})
