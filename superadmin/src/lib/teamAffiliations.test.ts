import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { Federation, League, Saison, Team } from '@/lib/entities'
import {
  changeAffiliation,
  endAffiliation,
  getActiveAffiliation,
  getAffiliationAt,
  listAffiliations,
  setAffiliationStatus,
  TeamAffiliationError,
} from './teamAffiliations'

let dataSource: DataSource

beforeEach(async () => {
  dataSource = await createTestDataSource()
})

afterEach(async () => {
  await dataSource.destroy()
})

async function seed() {
  const federationRepo = dataSource.getRepository(Federation)
  const leagueRepo = dataSource.getRepository(League)
  const saisonRepo = dataSource.getRepository(Saison)
  const teamRepo = dataSource.getRepository(Team)

  const fedA = await federationRepo.save(federationRepo.create({ code: 'FTF', nom: 'Fédération A', is_active: true }))
  const fedB = await federationRepo.save(federationRepo.create({ code: 'FXX', nom: 'Fédération B', is_active: true }))

  const leagueA1 = await leagueRepo.save(leagueRepo.create({ federation_id: fedA.id, nom: 'Ligue 1', is_active: true }))
  const leagueA2 = await leagueRepo.save(leagueRepo.create({ federation_id: fedA.id, nom: 'Ligue 2', is_active: true }))

  const saisonA1 = await saisonRepo.save(
    saisonRepo.create({ nom: 'Saison 2025-2026', type_competition: 'championnat', league_id: leagueA1.id }),
  )

  const team = await teamRepo.save(teamRepo.create({ nom: 'Espérance de Tunis', abbr: 'EST', team_type: 'club' }))

  return { fedA, fedB, leagueA1, leagueA2, saisonA1, team }
}

describe('changeAffiliation', () => {
  it('creates the first affiliation for a club that never had one', async () => {
    const { fedA, leagueA1, saisonA1, team } = await seed()

    const affiliation = await changeAffiliation(dataSource, {
      teamId: team.id,
      federationId: fedA.id,
      leagueId: leagueA1.id,
      saisonId: saisonA1.id,
      startDate: '2025-08-01',
    })

    expect(affiliation.status).toBe('ACTIVE')
    expect(await getActiveAffiliation(dataSource, team.id)).toMatchObject({ id: affiliation.id })
  })

  it('closes the previous ACTIVE affiliation without deleting it (promotion/relégation/changement de ligue)', async () => {
    const { fedA, leagueA1, leagueA2, team } = await seed()

    const first = await changeAffiliation(dataSource, {
      teamId: team.id,
      federationId: fedA.id,
      leagueId: leagueA1.id,
      startDate: '2024-08-01',
    })

    const second = await changeAffiliation(dataSource, {
      teamId: team.id,
      federationId: fedA.id,
      leagueId: leagueA2.id,
      startDate: '2025-08-01',
    })

    const history = await listAffiliations(dataSource, team.id)
    expect(history).toHaveLength(2)

    const closedFirst = history.find((a) => a.id === first.id)!
    expect(closedFirst.status).toBe('ENDED')
    expect(closedFirst.endDate).toBe('2025-07-31')

    const active = await getActiveAffiliation(dataSource, team.id)
    expect(active?.id).toBe(second.id)
    expect(active?.leagueId).toBe(leagueA2.id)
  })

  it('rejects a league that does not belong to the given federation (migration.md §3)', async () => {
    const { fedB, leagueA1, team } = await seed()

    await expect(
      changeAffiliation(dataSource, {
        teamId: team.id,
        federationId: fedB.id,
        leagueId: leagueA1.id,
        startDate: '2025-08-01',
      }),
    ).rejects.toThrow(TeamAffiliationError)
  })

  it('rejects backdating a new affiliation before the currently active one started', async () => {
    const { fedA, leagueA1, team } = await seed()

    await changeAffiliation(dataSource, {
      teamId: team.id,
      federationId: fedA.id,
      leagueId: leagueA1.id,
      startDate: '2025-08-01',
    })

    await expect(
      changeAffiliation(dataSource, {
        teamId: team.id,
        federationId: fedA.id,
        leagueId: leagueA1.id,
        startDate: '2025-01-01',
      }),
    ).rejects.toThrow(TeamAffiliationError)
  })
})

describe('endAffiliation (désaffiliation, migration.md §6)', () => {
  it('closes the active affiliation without creating a new row', async () => {
    const { fedA, leagueA1, team } = await seed()
    await changeAffiliation(dataSource, { teamId: team.id, federationId: fedA.id, leagueId: leagueA1.id, startDate: '2025-08-01' })

    const ended = await endAffiliation(dataSource, { teamId: team.id, endDate: '2026-06-01' })

    expect(ended.status).toBe('ENDED')
    expect(await getActiveAffiliation(dataSource, team.id)).toBeNull()
    expect(await listAffiliations(dataSource, team.id)).toHaveLength(1)
  })

  it('throws when the club has no active affiliation', async () => {
    const { team } = await seed()
    await expect(endAffiliation(dataSource, { teamId: team.id, endDate: '2026-06-01' })).rejects.toThrow(TeamAffiliationError)
  })
})

describe('getAffiliationAt (migration.md §22 — appartenance historique à une date)', () => {
  it('returns the club that owned the match date, even after a later transfer/change', async () => {
    const { fedA, leagueA1, leagueA2, team } = await seed()

    const first = await changeAffiliation(dataSource, {
      teamId: team.id,
      federationId: fedA.id,
      leagueId: leagueA1.id,
      startDate: '2024-08-01',
    })
    const second = await changeAffiliation(dataSource, {
      teamId: team.id,
      federationId: fedA.id,
      leagueId: leagueA2.id,
      startDate: '2025-08-01',
    })

    // Match joué le 10/08/2026 après un changement de ligue le 16/08/2026
    // (exemple migration.md §22) : reformulé ici avec des dates déjà
    // passées pour la clarté du test — le principe est identique.
    expect((await getAffiliationAt(dataSource, team.id, '2025-01-15'))?.id).toBe(first.id)
    expect((await getAffiliationAt(dataSource, team.id, '2025-08-01'))?.id).toBe(second.id)
    expect((await getAffiliationAt(dataSource, team.id, '2025-07-31'))?.id).toBe(first.id)
    expect(await getAffiliationAt(dataSource, team.id, '2020-01-01')).toBeNull()
  })
})

describe('setAffiliationStatus', () => {
  it('suspends an affiliation without ending it or changing its dates', async () => {
    const { fedA, leagueA1, team } = await seed()
    const affiliation = await changeAffiliation(dataSource, {
      teamId: team.id,
      federationId: fedA.id,
      leagueId: leagueA1.id,
      startDate: '2025-08-01',
    })

    const suspended = await setAffiliationStatus(dataSource, affiliation.id, 'SUSPENDED', 'Sanction disciplinaire')

    expect(suspended.status).toBe('SUSPENDED')
    expect(suspended.startDate).toBe('2025-08-01')
    expect(suspended.endDate).toBeNull()
    // Suspendue, donc plus "ACTIVE" au sens strict (une nouvelle affiliation peut être créée si nécessaire).
    expect(await getActiveAffiliation(dataSource, team.id)).toBeNull()
  })
})
