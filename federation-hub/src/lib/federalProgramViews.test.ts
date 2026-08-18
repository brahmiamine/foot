import { describe, expect, it } from 'vitest'
import { assertSafeRegulatoryDocumentUrl, normalizeBroadcastingAllocations, withEffectiveExpiry } from './federalProgramViews'

describe('federal program views — expiration effective des assurances (FED-006)', () => {
  it('rewrites an ACTIVE policy past its expiry date to EXPIRED', () => {
    expect(withEffectiveExpiry({ status: 'ACTIVE', expires_at: '2000-01-01' }).status).toBe('EXPIRED')
  })

  it('rewrites a SUSPENDED policy past its expiry date to EXPIRED', () => {
    expect(withEffectiveExpiry({ status: 'SUSPENDED', expires_at: '2000-01-01' }).status).toBe('EXPIRED')
  })

  it('keeps an ACTIVE policy whose expiry is in the future', () => {
    expect(withEffectiveExpiry({ status: 'ACTIVE', expires_at: '2099-01-01' }).status).toBe('ACTIVE')
  })

  it('never rewrites a status that never entered into force', () => {
    expect(withEffectiveExpiry({ status: 'DRAFT', expires_at: '2000-01-01' }).status).toBe('DRAFT')
    expect(withEffectiveExpiry({ status: 'SUBMITTED', expires_at: '2000-01-01' }).status).toBe('SUBMITTED')
    expect(withEffectiveExpiry({ status: 'UNDER_REVIEW', expires_at: '2000-01-01' }).status).toBe('UNDER_REVIEW')
    expect(withEffectiveExpiry({ status: 'REJECTED', expires_at: '2000-01-01' }).status).toBe('REJECTED')
  })
})

describe('federal program views — allocations média (existant)', () => {
  it('computes the net total and rejects deductions above the gross share', () => {
    expect(normalizeBroadcastingAllocations([{ clubId: 'c1', fixedAmount: 100, performanceAmount: 0, broadcastAmount: 0, bonusAmount: 0, deductions: 10 }])[0].totalAmount).toBe(90)
    expect(() => normalizeBroadcastingAllocations([{ clubId: 'c1', fixedAmount: 100, deductions: 200 }])).toThrow()
  })
})

describe('federal program views — sécurité des URLs de documents (existant)', () => {
  it('accepts HTTPS and internal paths only', () => {
    expect(assertSafeRegulatoryDocumentUrl('https://example.com/doc.pdf')).toBe('https://example.com/doc.pdf')
    expect(assertSafeRegulatoryDocumentUrl('/uploads/doc.pdf')).toBe('/uploads/doc.pdf')
    expect(() => assertSafeRegulatoryDocumentUrl('javascript:alert(1)')).toThrow()
    expect(() => assertSafeRegulatoryDocumentUrl('')).toThrow()
  })
})
