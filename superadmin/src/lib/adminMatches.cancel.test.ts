import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { Federation, League, Saison, Journee, Team, Match } from '@/lib/entities'
import { MatchSagaCase } from '@/lib/entities/MatchSagaCase'
import { MatchSagaStep } from '@/lib/entities/MatchSagaStep'

let dataSource: DataSource

vi.mock('@/lib/db', () => ({
  getDataSource: async () => dataSource,
}))

vi.mock('@/lib/notificationClient', () => ({
  notify: vi.fn(async () => {}),
}))

const cancelMatchTickets = vi.fn()
const cancelMatchConvocations = vi.fn()
vi.mock('@/lib/matchSagaClients', () => ({
  cancelMatchTickets: (matchId: string) => cancelMatchTickets(matchId),
  cancelMatchConvocations: (matchId: string, reason: string) => cancelMatchConvocations(matchId, reason),
}))

async function seedUpcomingMatch() {
  const federation = await dataSource.getRepository(Federation).save({ code: 'FTF', nom: 'Fédération Tunisienne' })
  const league = await dataSource.getRepository(League).save({ federation_id: federation.id, nom: 'Ligue 1', is_active: true })
  const saison = await dataSource
    .getRepository(Saison)
    .save({ nom: '2025-2026', type_competition: 'championnat', league_id: league.id })
  const journee = await dataSource.getRepository(Journee).save({ saison_id: saison.id, numero: 1 })
  const home = await dataSource.getRepository(Team).save({ nom: 'Home FC' })
  const away = await dataSource.getRepository(Team).save({ nom: 'Away FC' })
  const match = await dataSource.getRepository(Match).save({
    journee_id: journee.id,
    equipe_home_id: home.id,
    equipe_away_id: away.id,
    status: 'UPCOMING',
  })
  return { match }
}

/**
 * TASK-P0-003 (todo.md) : cancelMatchAdmin déclenche désormais la saga de
 * compensation (billetterie/teamManager) après avoir basculé
 * matches.status -> CANCELLED — voir matchSaga.ts.
 */
describe('cancelMatchAdmin — saga de compensation (TASK-P0-003)', () => {
  beforeEach(async () => {
    dataSource = await createTestDataSource()
    cancelMatchTickets.mockReset()
    cancelMatchConvocations.mockReset()
  })

  afterEach(async () => {
    await dataSource.destroy()
  })

  it('bascule matches.status -> CANCELLED et ouvre un dossier de saga COMPLETED quand les deux étapes réussissent', async () => {
    const { cancelMatchAdmin } = await import('./adminMatches')
    cancelMatchTickets.mockResolvedValue(undefined)
    cancelMatchConvocations.mockResolvedValue(undefined)
    const { match } = await seedUpcomingMatch()

    const result = await cancelMatchAdmin(match.id, 'Terrain impraticable.', 'admin1')

    expect(result.success).toBe(true)
    const reloaded = await dataSource.getRepository(Match).findOne({ where: { id: match.id } })
    expect(reloaded?.status).toBe('CANCELLED')

    const sagaCase = await dataSource.getRepository(MatchSagaCase).findOne({ where: { match_id: match.id } })
    expect(sagaCase?.status).toBe('COMPLETED')
    expect(sagaCase?.initiated_by).toBe('admin1')
  })

  it("le match reste CANCELLED même si la saga échoue entièrement (compensation, pas une condition d'annulation)", async () => {
    const { cancelMatchAdmin } = await import('./adminMatches')
    cancelMatchTickets.mockRejectedValue(new Error('billetterie unreachable'))
    cancelMatchConvocations.mockRejectedValue(new Error('teamManager unreachable'))
    const { match } = await seedUpcomingMatch()

    const result = await cancelMatchAdmin(match.id, 'Terrain impraticable.', 'admin1')

    expect(result.success).toBe(true)
    const reloaded = await dataSource.getRepository(Match).findOne({ where: { id: match.id } })
    expect(reloaded?.status).toBe('CANCELLED')

    const sagaCase = await dataSource.getRepository(MatchSagaCase).findOne({ where: { match_id: match.id } })
    expect(sagaCase?.status).toBe('MANUAL_REVIEW')
    const steps = await dataSource.getRepository(MatchSagaStep).find({ where: { saga_id: sagaCase!.id } })
    expect(steps).toHaveLength(2)
    expect(steps.every((s) => s.status === 'FAILED')).toBe(true)
  })

  it('rejette toujours un match déjà non-UPCOMING avant de toucher à la saga', async () => {
    const { cancelMatchAdmin } = await import('./adminMatches')
    const { match } = await seedUpcomingMatch()
    await dataSource.getRepository(Match).update(match.id, { status: 'FINISHED' })

    await expect(cancelMatchAdmin(match.id, 'x', 'admin1')).rejects.toThrow()
    expect(cancelMatchTickets).not.toHaveBeenCalled()
    expect(cancelMatchConvocations).not.toHaveBeenCalled()
  })
})
