import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClubPlayerRegulatoryFactsPort } from '../../../../packages/domain-contracts/src/club-player-facts'

const query = vi.fn()
const save = vi.fn(async (value: unknown) => value)
const create = vi.fn((value: unknown) => value)

vi.mock('@/lib/db', () => ({
  getDataSource: async () => ({
    query,
    getRepository: () => ({ create, save }),
  }),
}))

beforeEach(() => {
  query.mockReset()
  save.mockClear()
  create.mockClear()
})

function federationQueryResult(sql: string) {
  if (sql.includes('FROM matches')) {
    return [{
      equipeHome: 'club-1',
      equipeAway: 'club-2',
      matchDate: new Date('2026-08-15T14:00:00.000Z'),
      seasonId: 'season-1',
    }]
  }
  if (sql.includes('FROM saisons')) {
    return [{
      requiresPlayerContract: false,
      requiresMedicalClearance: false,
      minimumHeadCoachQualification: null,
    }]
  }
  if (sql.includes('regulatory_legacy_confirmations')) return []
  if (sql.includes('person_licenses')) return [{ found: 1 }]
  if (sql.includes('player_registrations')) {
    return [{ status: 'APPROVED', eligibilityStatus: 'ELIGIBLE' }]
  }
  if (sql.includes('competition_registrations')) return [{ found: 1 }]
  if (sql.includes('player_transfers')) return [{ found: 0 }]
  if (sql.includes('FROM teams')) return [{ ageCategory: 'seniors' }]
  throw new Error(`Unexpected federation query: ${sql}`)
}

describe('RegulatoryEligibilityService Club facts boundary', () => {
  it('uses Club facts for membership, suspension and birth date', async () => {
    query.mockImplementation(async (sql: string) => federationQueryResult(sql))
    const clubFacts: ClubPlayerRegulatoryFactsPort = {
      getPlayerRegulatoryFacts: vi.fn(async () => ({
        hasActiveMembership: false,
        hasActiveSuspension: true,
        birthDate: '2006-04-10',
      })),
    }

    const { RegulatoryEligibilityService } = await import('./RegulatoryEligibilityService')
    const result = await new RegulatoryEligibilityService(clubFacts).checkPlayerEligibility({
      playerId: 'player-1',
      clubId: 'club-1',
      matchId: 'match-1',
    })

    expect(clubFacts.getPlayerRegulatoryFacts).toHaveBeenCalledWith({
      playerId: 'player-1',
      clubId: 'club-1',
      at: '2026-08-15T14:00:00.000Z',
    })
    expect(result.blockingReasons).toEqual(
      expect.arrayContaining(['NO_ACTIVE_MEMBERSHIP', 'ACTIVE_SUSPENSION']),
    )
    expect(result.warnings).not.toContain('DATE_OF_BIRTH_MISSING')
  })
})
