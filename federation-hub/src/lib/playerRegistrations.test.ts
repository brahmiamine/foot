import { describe, expect, it } from 'vitest'
import { assertPlayerRegistrationTransition, eligibilityForRegistrationStatus } from '../../../packages/regulatory-shared/src/playerRegistration'

describe('player registration workflow', () => {
  it('supports approval, suspension and reactivation', () => {
    expect(() => assertPlayerRegistrationTransition('SUBMITTED', 'APPROVED')).not.toThrow()
    expect(() => assertPlayerRegistrationTransition('APPROVED', 'SUSPENDED')).not.toThrow()
    expect(() => assertPlayerRegistrationTransition('SUSPENDED', 'APPROVED')).not.toThrow()
  })
  it('makes cancellation terminal', () => {
    expect(() => assertPlayerRegistrationTransition('DRAFT', 'CANCELLED')).not.toThrow()
    expect(() => assertPlayerRegistrationTransition('CANCELLED', 'DRAFT')).toThrow()
  })
  it('keeps a submitted registration pending', () => expect(eligibilityForRegistrationStatus('SUBMITTED')).toBe('PENDING'))
  it('marks rejected and suspended registrations ineligible', () => {
    expect(eligibilityForRegistrationStatus('REJECTED')).toBe('INELIGIBLE')
    expect(eligibilityForRegistrationStatus('SUSPENDED')).toBe('INELIGIBLE')
  })
})
