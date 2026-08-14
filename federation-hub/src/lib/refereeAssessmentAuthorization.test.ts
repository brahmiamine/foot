import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { seedBaseGraph } from '@/test/fixtures'
import type { SsoUser } from './ssoSession'

let dataSource: DataSource
const listMatchOfficials = vi.fn()

vi.mock('./db', () => ({ getDataSource: async () => dataSource }))
vi.mock('./matchOfficialClient', () => ({
  listMatchOfficials: (matchId: string) => listMatchOfficials(matchId),
}))

function session(overrides: Partial<SsoUser>): SsoUser {
  return {
    id: 'observer-1',
    email: 'observer@example.com',
    name: 'Observer',
    role: 'REFEREE_OBSERVER',
    teamId: null,
    federationId: null,
    leagueId: null,
    ...overrides,
  }
}

beforeEach(async () => {
  dataSource = await createTestDataSource()
  listMatchOfficials.mockReset()
})

afterEach(async () => dataSource.destroy())

describe('official assessment server authorization', () => {
  it('allows the assigned observer to assess a referee assigned to the same match', async () => {
    const { authorizeAssessmentCreation } = await import('./refereeAssessmentAuthorization')
    const { match, arbitre, federation, league } = await seedBaseGraph(dataSource)
    listMatchOfficials.mockResolvedValue([
      { id: 1, matchId: match.id, userId: 'observer-1', role: 'REFEREE_OBSERVER', status: 'ACTIVE' },
      { id: 2, matchId: match.id, userId: 'ref-user', refereeId: arbitre.id, role: 'CENTER_REFEREE', status: 'ACTIVE' },
    ])

    await expect(authorizeAssessmentCreation(session({}), match.id, arbitre.id)).resolves.toEqual({
      federationId: federation.id,
      leagueId: league.id,
    })
  })

  it('rejects an observer who is not assigned to the match', async () => {
    const { authorizeAssessmentCreation } = await import('./refereeAssessmentAuthorization')
    const { match, arbitre } = await seedBaseGraph(dataSource)
    listMatchOfficials.mockResolvedValue([
      { id: 2, matchId: match.id, userId: 'ref-user', refereeId: arbitre.id, role: 'CENTER_REFEREE', status: 'ACTIVE' },
    ])
    await expect(authorizeAssessmentCreation(session({}), match.id, arbitre.id)).rejects.toThrow("L'observateur n'est pas affecté")
  })

  it('rejects a forged referee id that is not assigned to the match', async () => {
    const { authorizeAssessmentCreation } = await import('./refereeAssessmentAuthorization')
    const { match, arbitre } = await seedBaseGraph(dataSource)
    listMatchOfficials.mockResolvedValue([
      { id: 1, matchId: match.id, userId: 'observer-1', role: 'REFEREE_OBSERVER', status: 'ACTIVE' },
    ])
    await expect(authorizeAssessmentCreation(session({}), match.id, arbitre.id)).rejects.toThrow("n'est pas désigné")
  })

  it('enforces league scope for a LEAGUE_ADMIN', async () => {
    const { authorizeAssessmentCreation } = await import('./refereeAssessmentAuthorization')
    const { match, arbitre, league } = await seedBaseGraph(dataSource)
    listMatchOfficials.mockResolvedValue([
      { id: 2, matchId: match.id, userId: 'ref-user', refereeId: arbitre.id, role: 'CENTER_REFEREE', status: 'ACTIVE' },
    ])
    await expect(
      authorizeAssessmentCreation(session({ role: 'LEAGUE_ADMIN', leagueId: 'other-league' }), match.id, arbitre.id),
    ).rejects.toThrow('hors périmètre')
    await expect(
      authorizeAssessmentCreation(session({ role: 'LEAGUE_ADMIN', leagueId: league.id }), match.id, arbitre.id),
    ).resolves.toBeTruthy()
  })

  it('prevents federation and league admins from editing an observer draft', async () => {
    const { authorizeAssessmentResource } = await import('./refereeAssessmentAuthorization')
    const evaluation = {
      observer_user_id: 'observer-1',
      federation_id: 'fed-1',
      league_id: 'league-1',
    } as never

    expect(() =>
      authorizeAssessmentResource(
        session({ role: 'FEDERATION_ADMIN', federationId: 'fed-1' }),
        evaluation,
        'edit',
      ),
    ).toThrow('Seul l’auteur')
    expect(() =>
      authorizeAssessmentResource(
        session({ role: 'LEAGUE_ADMIN', leagueId: 'league-1' }),
        evaluation,
        'submit',
      ),
    ).toThrow('Seul l’auteur')
  })
})
