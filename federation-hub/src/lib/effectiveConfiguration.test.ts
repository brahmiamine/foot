import { describe, expect, it } from 'vitest'
import { resolvePolicy, type PolicyRecord } from '../../../packages/domain-contracts/src/policy'
import { toEffectiveConfigurationSection } from '../../../packages/domain-contracts/src/effective-configuration'

type Values = { approvalMode: string; maxAmount: number; enabled: boolean }

const defaults: Values = { approvalMode: 'AUTO', maxAmount: 0, enabled: true }

describe('effective configuration contract', () => {
  it('keeps value provenance and applied versions when normalized for the UI', () => {
    const records: PolicyRecord<Values>[] = [
      {
        id: 'platform-v2',
        scopeType: 'PLATFORM',
        scopeId: null,
        version: 2,
        effectiveFrom: '2026-01-01T00:00:00Z',
        values: { maxAmount: 1000 },
      },
      {
        id: 'federation-v3',
        scopeType: 'FEDERATION',
        scopeId: 'fed-1',
        version: 3,
        effectiveFrom: '2026-06-01T00:00:00Z',
        values: { approvalMode: 'DUAL_APPROVAL' },
      },
    ]

    const resolved = resolvePolicy(defaults, records, { federationId: 'fed-1' }, new Date('2026-08-01T00:00:00Z'))
    const section = toEffectiveConfigurationSection('TEST', 'Test policy', resolved)

    expect(section.entries.find((entry) => entry.key === 'approvalMode')).toMatchObject({
      value: 'DUAL_APPROVAL',
      source: { kind: 'POLICY', recordId: 'federation-v3', scopeType: 'FEDERATION', version: 3 },
    })
    expect(section.entries.find((entry) => entry.key === 'maxAmount')).toMatchObject({
      value: 1000,
      source: { kind: 'POLICY', recordId: 'platform-v2', scopeType: 'PLATFORM', version: 2 },
    })
    expect(section.entries.find((entry) => entry.key === 'enabled')).toEqual({
      domain: 'TEST',
      key: 'enabled',
      value: true,
      source: { kind: 'DEFAULT' },
    })
    expect(section.appliedRecords).toEqual([
      { id: 'platform-v2', scopeType: 'PLATFORM', scopeId: null, version: 2 },
      { id: 'federation-v3', scopeType: 'FEDERATION', scopeId: 'fed-1', version: 3 },
    ])
  })
})
