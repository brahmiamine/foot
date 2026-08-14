import { describe, expect, it } from 'vitest'
import {
  assertClubLicenseTransition,
  assertRequirementsAllowApproval,
  ClubLicenseWorkflowError,
  isClubEditableStatus,
} from '../../../packages/regulatory-shared/src/clubLicensing'

describe('club licensing workflow', () => {
  it('accepts the complete review workflow including requested changes', () => {
    expect(() => assertClubLicenseTransition('DRAFT', 'SUBMITTED')).not.toThrow()
    expect(() => assertClubLicenseTransition('SUBMITTED', 'UNDER_REVIEW')).not.toThrow()
    expect(() => assertClubLicenseTransition('UNDER_REVIEW', 'CHANGES_REQUESTED')).not.toThrow()
    expect(() => assertClubLicenseTransition('CHANGES_REQUESTED', 'SUBMITTED')).not.toThrow()
    expect(() => assertClubLicenseTransition('UNDER_REVIEW', 'APPROVED')).not.toThrow()
  })

  it('rejects self approval and skipped review steps', () => {
    expect(() => assertClubLicenseTransition('DRAFT', 'APPROVED')).toThrow(ClubLicenseWorkflowError)
    expect(() => assertClubLicenseTransition('SUBMITTED', 'APPROVED')).toThrow(ClubLicenseWorkflowError)
  })

  it('blocks approval when a mandatory requirement is pending or non-compliant', () => {
    expect(() => assertRequirementsAllowApproval([{ mandatory: true, status: 'PENDING' }])).toThrow(
      ClubLicenseWorkflowError,
    )
    expect(() => assertRequirementsAllowApproval([{ mandatory: true, status: 'NON_COMPLIANT' }])).toThrow(
      ClubLicenseWorkflowError,
    )
  })

  it('requires an audited reason for every waiver', () => {
    expect(() => assertRequirementsAllowApproval([{ mandatory: true, status: 'WAIVED' }])).toThrow(
      ClubLicenseWorkflowError,
    )
    expect(() => assertRequirementsAllowApproval([{ mandatory: true, status: 'WAIVED', waiverReason: 'Décision du comité' }])).not.toThrow()
  })

  it('only lets the club edit draft or correction-requested dossiers', () => {
    expect(isClubEditableStatus('DRAFT')).toBe(true)
    expect(isClubEditableStatus('CHANGES_REQUESTED')).toBe(true)
    expect(isClubEditableStatus('UNDER_REVIEW')).toBe(false)
    expect(isClubEditableStatus('APPROVED')).toBe(false)
  })
})
