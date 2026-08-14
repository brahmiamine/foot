import { describe, expect, it } from 'vitest'
import { assertApprovalMetadata, assertPersonLicenseTransition, isPersonLicenseActive } from '../../../packages/regulatory-shared/src/personLicensing'

describe('person licensing workflow', () => {
  it('allows suspension and reactivation of an approved license', () => {
    expect(() => assertPersonLicenseTransition('APPROVED', 'SUSPENDED')).not.toThrow()
    expect(() => assertPersonLicenseTransition('SUSPENDED', 'APPROVED')).not.toThrow()
  })

  it('makes revocation terminal', () => {
    expect(() => assertPersonLicenseTransition('APPROVED', 'REVOKED')).not.toThrow()
    expect(() => assertPersonLicenseTransition('REVOKED', 'APPROVED')).toThrow()
  })

  it('rejects malformed expiration metadata', () => {
    expect(() => assertApprovalMetadata({ licenseNumber: 'FTF-1', expiresAt: 'invalid' })).toThrow()
  })

  it('does not expose suspended or expired approvals as active', () => {
    const now = new Date('2027-01-01T00:00:00Z')
    expect(isPersonLicenseActive('APPROVED', null, now)).toBe(true)
    expect(isPersonLicenseActive('SUSPENDED', null, now)).toBe(false)
    expect(isPersonLicenseActive('APPROVED', '2026-12-31', now)).toBe(false)
  })
})
