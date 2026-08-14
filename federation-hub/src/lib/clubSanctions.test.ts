import { describe, expect, it } from 'vitest'
import { assertClubSanctionTransition, blocksCompetitionEntry, blocksRegistrations, blocksTransfers, isClubSanctionEnforceable, requiresLiftMotivation } from '../../../packages/regulatory-shared/src/clubSanction'
describe('club sanction domain', () => {
  it('allows lifting or suspending an active sanction, never reopening a lifted one', () => {
    expect(() => assertClubSanctionTransition('ACTIVE', 'SUSPENDED')).not.toThrow()
    expect(() => assertClubSanctionTransition('ACTIVE', 'LIFTED')).not.toThrow()
    expect(() => assertClubSanctionTransition('SUSPENDED', 'ACTIVE')).not.toThrow()
    expect(() => assertClubSanctionTransition('LIFTED', 'ACTIVE')).toThrow()
    expect(() => assertClubSanctionTransition('EXPIRED', 'ACTIVE')).toThrow()
  })
  it('is only enforceable while ACTIVE and within its date window', () => {
    const now = new Date('2026-08-14')
    expect(isClubSanctionEnforceable('ACTIVE', '2026-01-01', null, now)).toBe(true)
    expect(isClubSanctionEnforceable('SUSPENDED', '2026-01-01', null, now)).toBe(false)
    expect(isClubSanctionEnforceable('ACTIVE', '2027-01-01', null, now)).toBe(false)
    expect(isClubSanctionEnforceable('ACTIVE', '2026-01-01', '2026-06-01', now)).toBe(false)
  })
  it('maps sanction types to the regulatory blocks they trigger', () => {
    expect(blocksTransfers('TRANSFER_BAN')).toBe(true)
    expect(blocksTransfers('FINE')).toBe(false)
    expect(blocksRegistrations('REGISTRATION_BAN')).toBe(true)
    expect(blocksCompetitionEntry('COMPETITION_BAN')).toBe(true)
    expect(blocksCompetitionEntry('COMPETITION_EXCLUSION')).toBe(true)
  })
  it('requires a motivation to lift or cancel a sanction', () => {
    expect(requiresLiftMotivation('LIFTED')).toBe(true)
    expect(requiresLiftMotivation('CANCELLED')).toBe(true)
    expect(requiresLiftMotivation('SUSPENDED')).toBe(false)
  })
})
