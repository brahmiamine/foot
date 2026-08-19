import { describe, expect, it, vi } from 'vitest'
import type { DataSource, EntityManager } from 'typeorm'
import type { SsoUser } from './ssoSession'
import {
  createGovernanceException,
  revokeGovernanceException,
} from './governanceExceptions'
import { FederalOperationAuthorizationError } from './federalOperationsCommon'

const federationAdmin: SsoUser = {
  id: 'fed-admin-1',
  email: 'fed@example.test',
  name: 'Fed Admin',
  role: 'FEDERATION_ADMIN',
  teamId: null,
  federationId: 'fed-1',
  leagueId: null,
}

function dataSourceForCreate() {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('SELECT id FROM governance_exceptions')) return []
    return []
  })
  const manager = { query } as unknown as EntityManager
  const transaction = vi.fn(async (callback: (value: EntityManager) => Promise<unknown>) => callback(manager))
  return { source: { transaction } as unknown as DataSource, query, transaction }
}

describe('governance exception administration (GOV-007)', () => {
  it('creates an exception and writes the standard federal audit in the same transaction', async () => {
    const { source, query } = dataSourceForCreate()

    const created = await createGovernanceException(
      source,
      federationAdmin,
      {
        userId: federationAdmin.id,
        role: federationAdmin.role,
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
      },
      {
        federationId: 'fed-1',
        ruleKey: 'REGULATORY_DOCUMENT_REQUIRED',
        targetType: 'GRANT_APPLICATION',
        targetId: 'application-1',
        reference: 'requirement-1',
        reason: 'Décision exceptionnelle documentée',
        validFrom: '2026-08-19T10:00:00Z',
        validUntil: '2026-08-20T10:00:00Z',
      },
    )

    expect(created).toMatchObject({
      federationId: 'fed-1',
      ruleKey: 'REGULATORY_DOCUMENT_REQUIRED',
      targetId: 'application-1',
      reference: 'requirement-1',
    })
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO governance_exceptions'))).toBe(true)
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO federal_operation_audit'))).toBe(true)
  })

  it('prevents a league admin from creating its own waiver', async () => {
    const leagueAdmin: SsoUser = {
      ...federationAdmin,
      id: 'league-admin-1',
      role: 'LEAGUE_ADMIN',
      leagueId: 'league-1',
    }
    const { source, transaction } = dataSourceForCreate()

    await expect(
      createGovernanceException(
        source,
        leagueAdmin,
        { userId: leagueAdmin.id, role: leagueAdmin.role },
        {
          federationId: 'fed-1',
          leagueId: 'league-1',
          ruleKey: 'REGULATORY_DOCUMENT_REQUIRED',
          targetType: 'GRANT_APPLICATION',
          targetId: 'application-1',
          reference: 'requirement-1',
          reason: 'Tentative de dérogation',
          validUntil: '2026-08-20T10:00:00Z',
        },
      ),
    ).rejects.toBeInstanceOf(FederalOperationAuthorizationError)
    expect(transaction).not.toHaveBeenCalled()
  })

  it('revokes without deleting and records the revocation reason in audit', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.startsWith('SELECT * FROM governance_exceptions')) {
        return [{
          id: 'ex-1',
          federation_id: 'fed-1',
          league_id: null,
          rule_key: 'REGULATORY_DOCUMENT_REQUIRED',
          target_type: 'GRANT_APPLICATION',
          target_id: 'application-1',
          reference_key: 'requirement-1',
          reason: 'Création',
          valid_from: new Date('2026-08-19T10:00:00Z'),
          valid_until: new Date('2026-08-20T10:00:00Z'),
          created_by: 'fed-admin-1',
          created_at: new Date('2026-08-19T10:00:00Z'),
          revoked_at: null,
          revoked_by: null,
          revoke_reason: null,
        }]
      }
      return []
    })
    const manager = { query } as unknown as EntityManager
    const source = {
      query,
      transaction: vi.fn(async (callback: (value: EntityManager) => Promise<unknown>) => callback(manager)),
    } as unknown as DataSource

    const revoked = await revokeGovernanceException(
      source,
      federationAdmin,
      { userId: federationAdmin.id, role: federationAdmin.role },
      'ex-1',
      'La décision exceptionnelle est annulée',
    )

    expect(revoked.revokeReason).toBe('La décision exceptionnelle est annulée')
    expect(query.mock.calls.some(([sql]) => sql.includes('UPDATE governance_exceptions'))).toBe(true)
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO federal_operation_audit'))).toBe(true)
    expect(query.mock.calls.some(([sql]) => sql.includes('DELETE FROM governance_exceptions'))).toBe(false)
  })
})
