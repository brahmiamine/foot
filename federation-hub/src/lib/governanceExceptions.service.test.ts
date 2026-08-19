import { describe, expect, it, vi } from 'vitest'
import type { FederalOperationSource } from './federalOperationsCommon'
import { FederalOperationWorkflowError } from './federalOperationsRules'
import { assertGrantJustificatifsWithExceptionsSatisfied } from './governanceExceptions'

function sourceWithException(exceptionRows: unknown[]) {
  const query = vi.fn(async (sql: string, _params?: unknown[]) => {
    if (sql.includes('FROM regulatory_document_requirements')) {
      return [{ id: 'requirement-1', name: 'Attestation fiscale' }]
    }
    if (sql.includes('FROM regulatory_document_submissions')) return []
    if (sql.includes('FROM governance_exceptions')) return exceptionRows
    return []
  })
  return { source: { query } as unknown as FederalOperationSource, query }
}

describe('governance exception enforcement (GOV-007)', () => {
  it('allows a grant approval only when the missing requirement has an exact active exception', async () => {
    const { source, query } = sourceWithException([
      {
        id: 'ex-1',
        federation_id: 'fed-1',
        league_id: null,
        rule_key: 'REGULATORY_DOCUMENT_REQUIRED',
        target_type: 'GRANT_APPLICATION',
        target_id: 'application-1',
        reference_key: 'requirement-1',
        reason: 'Décision exceptionnelle',
        valid_from: new Date('2026-08-19T08:00:00Z'),
        valid_until: new Date('2026-08-20T08:00:00Z'),
        created_by: 'fed-admin',
        created_at: new Date('2026-08-19T08:00:00Z'),
        revoked_at: null,
        revoked_by: null,
        revoke_reason: null,
      },
    ])

    await expect(
      assertGrantJustificatifsWithExceptionsSatisfied(
        source,
        'fed-1',
        null,
        'season-1',
        'application-1',
        new Date('2026-08-19T12:00:00Z'),
      ),
    ).resolves.toBeUndefined()

    const exceptionCall = query.mock.calls.find(([sql]) => sql.includes('FROM governance_exceptions'))
    expect(exceptionCall?.[1]).toEqual(expect.arrayContaining([
      'fed-1',
      'REGULATORY_DOCUMENT_REQUIRED',
      'GRANT_APPLICATION',
      'application-1',
      'requirement-1',
    ]))
  })

  it('keeps the original server guard when no matching exception exists', async () => {
    const { source } = sourceWithException([])

    await expect(
      assertGrantJustificatifsWithExceptionsSatisfied(
        source,
        'fed-1',
        null,
        'season-1',
        'application-1',
        new Date('2026-08-19T12:00:00Z'),
      ),
    ).rejects.toBeInstanceOf(FederalOperationWorkflowError)
  })
})
