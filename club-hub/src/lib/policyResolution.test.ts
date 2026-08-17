import { describe, expect, it } from 'vitest'
import {
  resolvePolicy,
  type PolicyRecord,
} from '../../../packages/domain-contracts/src/policy'

type DemoPolicy = {
  approvalRequired: boolean
  approvalMode: 'AUTO' | 'SINGLE_APPROVAL' | 'DUAL_APPROVAL'
  slaHours: number
  reapprovalOnSensitiveChange: boolean
}

const defaults: DemoPolicy = {
  approvalRequired: false,
  approvalMode: 'AUTO',
  slaHours: 72,
  reapprovalOnSensitiveChange: false,
}

function record(
  overrides: Partial<PolicyRecord<DemoPolicy>> & Pick<PolicyRecord<DemoPolicy>, 'id' | 'scopeType' | 'version'>,
): PolicyRecord<DemoPolicy> {
  return {
    scopeId: null,
    values: {},
    ...overrides,
  }
}

describe('resolvePolicy', () => {
  it('inherits platform values and lets more specific scopes override only selected keys', () => {
    const resolved = resolvePolicy(
      defaults,
      [
        record({
          id: 'platform-v1',
          scopeType: 'PLATFORM',
          version: 1,
          values: { approvalRequired: true, approvalMode: 'SINGLE_APPROVAL', slaHours: 48 },
        }),
        record({
          id: 'fed-v1',
          scopeType: 'FEDERATION',
          scopeId: 'fed-1',
          version: 1,
          values: { slaHours: 24 },
        }),
        record({
          id: 'club-v1',
          scopeType: 'CLUB',
          scopeId: 'club-1',
          version: 1,
          values: { approvalMode: 'DUAL_APPROVAL' },
        }),
      ],
      { federationId: 'fed-1', clubId: 'club-1' },
      new Date('2026-08-17T08:00:00Z'),
    )

    expect(resolved.values).toEqual({
      approvalRequired: true,
      approvalMode: 'DUAL_APPROVAL',
      slaHours: 24,
      reapprovalOnSensitiveChange: false,
    })
    expect(resolved.sources.approvalRequired).toMatchObject({
      recordId: 'platform-v1',
      scopeType: 'PLATFORM',
    })
    expect(resolved.sources.slaHours).toMatchObject({
      recordId: 'fed-v1',
      scopeType: 'FEDERATION',
    })
    expect(resolved.sources.approvalMode).toMatchObject({
      recordId: 'club-v1',
      scopeType: 'CLUB',
    })
    expect(resolved.sources.reapprovalOnSensitiveChange).toEqual({ kind: 'DEFAULT' })
  })

  it('ignores records from unrelated tenant scopes', () => {
    const resolved = resolvePolicy(
      defaults,
      [
        record({
          id: 'other-club',
          scopeType: 'CLUB',
          scopeId: 'club-2',
          version: 1,
          values: { approvalRequired: true },
        }),
      ],
      { clubId: 'club-1' },
    )

    expect(resolved.values).toEqual(defaults)
    expect(resolved.appliedRecords).toEqual([])
  })

  it('uses only records active at the requested instant', () => {
    const resolved = resolvePolicy(
      defaults,
      [
        record({
          id: 'expired',
          scopeType: 'PLATFORM',
          version: 1,
          effectiveUntil: '2026-07-01T00:00:00Z',
          values: { approvalRequired: true },
        }),
        record({
          id: 'current',
          scopeType: 'PLATFORM',
          version: 2,
          effectiveFrom: '2026-07-01T00:00:00Z',
          values: { slaHours: 12 },
        }),
      ],
      {},
      new Date('2026-08-17T08:00:00Z'),
    )

    expect(resolved.values.approvalRequired).toBe(false)
    expect(resolved.values.slaHours).toBe(12)
    expect(resolved.appliedRecords.map((item) => item.id)).toEqual(['current'])
  })

  it('selects the highest active version inside one scope', () => {
    const resolved = resolvePolicy(
      defaults,
      [
        record({
          id: 'club-v1',
          scopeType: 'CLUB',
          scopeId: 'club-1',
          version: 1,
          values: { slaHours: 48 },
        }),
        record({
          id: 'club-v2',
          scopeType: 'CLUB',
          scopeId: 'club-1',
          version: 2,
          values: { slaHours: 8 },
        }),
      ],
      { clubId: 'club-1' },
    )

    expect(resolved.values.slaHours).toBe(8)
    expect(resolved.appliedRecords).toEqual([
      { id: 'club-v2', scopeType: 'CLUB', scopeId: 'club-1', version: 2 },
    ])
  })

  it('fails closed on ambiguous snapshots or unknown policy keys', () => {
    expect(() =>
      resolvePolicy(
        defaults,
        [
          record({
            id: 'a',
            scopeType: 'CLUB',
            scopeId: 'club-1',
            version: 2,
            values: { slaHours: 8 },
          }),
          record({
            id: 'b',
            scopeType: 'CLUB',
            scopeId: 'club-1',
            version: 2,
            values: { slaHours: 12 },
          }),
        ],
        { clubId: 'club-1' },
      ),
    ).toThrow(/Ambiguous active policy/)

    const invalid = record({
      id: 'bad-key',
      scopeType: 'PLATFORM',
      version: 1,
      values: { typo: true } as unknown as Partial<DemoPolicy>,
    })
    expect(() => resolvePolicy(defaults, [invalid], {})).toThrow(/unknown key typo/)
  })
})
