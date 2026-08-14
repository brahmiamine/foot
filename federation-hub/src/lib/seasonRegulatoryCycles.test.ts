import { describe, expect, it } from 'vitest'
import { assertSeasonRegulatoryCycleTransition, isRegulatoryWindowOpen } from '../../../packages/regulatory-shared/src/seasonRegulatoryCycle'
describe('season regulatory cycle workflow', () => {
  it('only moves forward DRAFT -> ACTIVE -> CLOSED', () => {
    expect(() => assertSeasonRegulatoryCycleTransition('DRAFT', 'ACTIVE')).not.toThrow()
    expect(() => assertSeasonRegulatoryCycleTransition('ACTIVE', 'CLOSED')).not.toThrow()
    expect(() => assertSeasonRegulatoryCycleTransition('CLOSED', 'ACTIVE')).toThrow()
    expect(() => assertSeasonRegulatoryCycleTransition('DRAFT', 'CLOSED')).not.toThrow()
  })
  it('is never open once the cycle is CLOSED, regardless of dates', () => {
    expect(isRegulatoryWindowOpen('CLOSED', '2020-01-01', null, new Date('2026-08-14'))).toBe(false)
  })
  it('is closed while no opening date has been configured', () => {
    expect(isRegulatoryWindowOpen('ACTIVE', null, null, new Date('2026-08-14'))).toBe(false)
  })
  it('respects the open/close date window once configured', () => {
    const now = new Date('2026-08-14')
    expect(isRegulatoryWindowOpen('ACTIVE', '2026-07-01', '2026-09-01', now)).toBe(true)
    expect(isRegulatoryWindowOpen('ACTIVE', '2026-09-01', null, now)).toBe(false)
    expect(isRegulatoryWindowOpen('ACTIVE', '2026-01-01', '2026-06-01', now)).toBe(false)
    expect(isRegulatoryWindowOpen('ACTIVE', '2026-01-01', null, now)).toBe(true)
  })
})
