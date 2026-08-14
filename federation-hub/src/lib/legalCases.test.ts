import { describe, expect, it } from 'vitest'
import { assertLegalCaseTransition, formatLegalCaseNumber, isLegalCaseOpen, isLegalCaseParty } from '../../../packages/regulatory-shared/src/legalCase'
describe('legal case workflow', () => {
  it('requires an admissibility review before acceptance', () => {
    expect(() => assertLegalCaseTransition('FILED', 'UNDER_REVIEW')).toThrow()
    expect(() => assertLegalCaseTransition('FILED', 'ADMISSIBILITY_REVIEW')).not.toThrow()
    expect(() => assertLegalCaseTransition('ADMISSIBILITY_REVIEW', 'UNDER_REVIEW')).not.toThrow()
  })
  it('makes INADMISSIBLE and WITHDRAWN terminal aside from closing', () => {
    expect(() => assertLegalCaseTransition('INADMISSIBLE', 'UNDER_REVIEW')).toThrow()
    expect(() => assertLegalCaseTransition('INADMISSIBLE', 'CLOSED')).not.toThrow()
    expect(() => assertLegalCaseTransition('WITHDRAWN', 'FILED')).toThrow()
  })
  it('allows deciding directly from UNDER_REVIEW without forcing a hearing', () => {
    expect(() => assertLegalCaseTransition('UNDER_REVIEW', 'DECIDED')).not.toThrow()
  })
  it('treats only non-terminal, non-decided statuses as open for new submissions', () => {
    expect(isLegalCaseOpen('FILED')).toBe(true)
    expect(isLegalCaseOpen('UNDER_REVIEW')).toBe(true)
    expect(isLegalCaseOpen('DECIDED')).toBe(false)
    expect(isLegalCaseOpen('CLOSED')).toBe(false)
  })
  it('recognizes a club as party only when type and id both match', () => {
    expect(isLegalCaseParty('CLUB', 'club-1', 'club-1')).toBe(true)
    expect(isLegalCaseParty('CLUB', 'club-2', 'club-1')).toBe(false)
    expect(isLegalCaseParty('PLAYER', 'club-1', 'club-1')).toBe(false)
  })
  it('formats a stable, zero-padded case number', () => {
    expect(formatLegalCaseNumber(2026, 7)).toBe('LC-2026-00007')
  })
})
