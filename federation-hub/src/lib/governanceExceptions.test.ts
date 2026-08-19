import { describe, expect, it } from 'vitest'
import {
  isGovernanceExceptionActive,
  matchesGovernanceException,
  type GovernanceExceptionRecord,
} from '../../../packages/domain-contracts/src/governance-exception'

const base: GovernanceExceptionRecord = {
  id: 'ex-1',
  ruleKey: 'REGULATORY_DOCUMENT_REQUIRED',
  targetType: 'GRANT_APPLICATION',
  targetId: 'application-1',
  reference: 'requirement-1',
  reason: 'Décision fédérale exceptionnelle',
  validFrom: '2026-08-19T08:00:00.000Z',
  validUntil: '2026-08-20T08:00:00.000Z',
  revokedAt: null,
}

describe('governance exception contract (GOV-007)', () => {
  it('is active only inside its bounded validity window', () => {
    expect(isGovernanceExceptionActive(base, new Date('2026-08-19T12:00:00Z'))).toBe(true)
    expect(isGovernanceExceptionActive(base, new Date('2026-08-19T07:59:59Z'))).toBe(false)
    expect(isGovernanceExceptionActive(base, new Date('2026-08-20T08:00:00Z'))).toBe(false)
  })

  it('never applies after revocation', () => {
    expect(
      isGovernanceExceptionActive(
        { ...base, revokedAt: '2026-08-19T10:00:00.000Z' },
        new Date('2026-08-19T12:00:00Z'),
      ),
    ).toBe(false)
  })

  it('matches the exact rule, target and external/reference key only', () => {
    expect(
      matchesGovernanceException(base, {
        ruleKey: 'REGULATORY_DOCUMENT_REQUIRED',
        targetType: 'GRANT_APPLICATION',
        targetId: 'application-1',
        reference: 'requirement-1',
      }),
    ).toBe(true)
    expect(
      matchesGovernanceException(base, {
        ruleKey: 'REGULATORY_DOCUMENT_REQUIRED',
        targetType: 'GRANT_APPLICATION',
        targetId: 'application-1',
        reference: 'requirement-other',
      }),
    ).toBe(false)
  })
})
