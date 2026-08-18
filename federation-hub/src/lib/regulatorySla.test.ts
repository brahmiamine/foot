import { describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import type { SsoUser } from './ssoSession'
import { DEFAULT_SLA_HOURS, listRegulatorySlaPolicies, REGULATORY_SLA_DOMAINS } from './regulatorySla'

const platformUser: SsoUser = { id: 'u1', email: 'u@test', name: 'U', role: 'PLATFORM_SUPERADMIN', teamId: null, federationId: null, leagueId: null }

function sourceWith(rows: Array<{ domain: string; warn_after_hours: number; overdue_after_hours: number }>): DataSource {
  return { query: vi.fn(async () => rows) } as unknown as DataSource
}

describe('listRegulatorySlaPolicies (FED-010)', () => {
  it('falls back to the documented defaults for every domain when nothing is configured', async () => {
    const policies = await listRegulatorySlaPolicies(sourceWith([]), platformUser, 'fed-1')
    expect(policies).toHaveLength(REGULATORY_SLA_DOMAINS.length)
    for (const policy of policies) {
      expect(policy.isDefault).toBe(true)
      expect(policy.warnAfterHours).toBe(DEFAULT_SLA_HOURS[policy.domain as keyof typeof DEFAULT_SLA_HOURS].warnAfterHours)
      expect(policy.overdueAfterHours).toBe(DEFAULT_SLA_HOURS[policy.domain as keyof typeof DEFAULT_SLA_HOURS].overdueAfterHours)
    }
  })

  it('overrides only the configured domain, leaving the rest on defaults', async () => {
    const policies = await listRegulatorySlaPolicies(sourceWith([{ domain: 'DISCIPLINE', warn_after_hours: 12, overdue_after_hours: 36 }]), platformUser, 'fed-1')
    const discipline = policies.find((policy) => policy.domain === 'DISCIPLINE')!
    expect(discipline).toMatchObject({ warnAfterHours: 12, overdueAfterHours: 36, isDefault: false })
    const grant = policies.find((policy) => policy.domain === 'GRANT')!
    expect(grant.isDefault).toBe(true)
  })
})
