import { describe, expect, it } from 'vitest'
import { assertDisciplinaryCaseTransition, formatDisciplinaryCaseNumber } from '../../../packages/regulatory-shared/src/disciplinaryCase'
describe('disciplinary case workflow', () => {
  it('progresses OPEN -> UNDER_REVIEW -> HEARING_SCHEDULED/DECIDED', () => {
    expect(() => assertDisciplinaryCaseTransition('OPEN', 'UNDER_REVIEW')).not.toThrow()
    expect(() => assertDisciplinaryCaseTransition('UNDER_REVIEW', 'HEARING_SCHEDULED')).not.toThrow()
    expect(() => assertDisciplinaryCaseTransition('UNDER_REVIEW', 'DECIDED')).not.toThrow()
    expect(() => assertDisciplinaryCaseTransition('HEARING_SCHEDULED', 'DECIDED')).not.toThrow()
  })
  it('allows closing at any non-terminal step, but never skipping straight to DECIDED from OPEN', () => {
    expect(() => assertDisciplinaryCaseTransition('OPEN', 'DECIDED')).toThrow()
    expect(() => assertDisciplinaryCaseTransition('OPEN', 'CLOSED')).not.toThrow()
  })
  it('makes CLOSED terminal and requires DECIDED before APPEALED', () => {
    expect(() => assertDisciplinaryCaseTransition('CLOSED', 'OPEN')).toThrow()
    expect(() => assertDisciplinaryCaseTransition('DECIDED', 'APPEALED')).not.toThrow()
    expect(() => assertDisciplinaryCaseTransition('UNDER_REVIEW', 'APPEALED')).toThrow()
  })
  it('formats a stable, zero-padded case number', () => {
    expect(formatDisciplinaryCaseNumber(2026, 3)).toBe('DC-2026-00003')
  })
})
