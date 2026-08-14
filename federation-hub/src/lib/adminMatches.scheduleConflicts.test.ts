import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { Federation, Journee, League, Match, Saison, Sheet, Team } from '@/lib/entities'

let dataSource: DataSource

vi.mock('@/lib/db', () => ({
  getDataSource: async () => dataSource,
}))

vi.mock('@/lib/notificationClient', () => ({
  notify: vi.fn(async () => {}),
}))

vi.mock('@/lib/matchOperationsClient', () => ({
  reopenSheet: vi.fn(async () => {}),
}))

async function seedSaison(overrides: Partial<Saison> = {}) {
  const federation = await dataSource.getRepository(Federation).save({ code: 'FTF', nom: 'Fédération Tunisienne' })
  const league = await dataSource.getRepository(League).save({ federation_id: federation.id, nom: 'Ligue 1', is_active: true })
  return dataSource.getRepository(Saison).save({
    nom: '2025-2026',
    type_competition: 'championnat',
    league_id: league.id,
    ...overrides,
  })
}

async function seedJournee(saisonId: string, overrides: Partial<Journee> = {}) {
  return dataSource.getRepository(Journee).save({ saison_id: saisonId, numero: 1, ...overrides })
}

async function seedTeam(overrides: Partial<Team> = {}) {
  return dataSource.getRepository(Team).save({ nom: 'Team', ...overrides })
}

describe('createMatchAdmin / updateMatchAdmin — conflits de programmation (TASK-P0-008)', () => {
  beforeEach(async () => {
    dataSource = await createTestDataSource()
    delete process.env.MATCH_MIN_REST_MINUTES
  })

  afterEach(async () => {
    await dataSource.destroy()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('crée un match sans conflit', async () => {
    const { createMatchAdmin } = await import('./adminMatches')
    const saison = await seedSaison()
    const journee = await seedJournee(saison.id)
    const home = await seedTeam({ nom: 'Home FC' })
    const away = await seedTeam({ nom: 'Away FC' })

    const { match, overriddenConflicts } = await createMatchAdmin({
      journee_id: journee.id,
      equipe_home: home.id,
      equipe_away: away.id,
      date: '2026-03-01T15:00:00Z',
    })

    expect(match.id).toBeDefined()
    expect(overriddenConflicts).toEqual([])
  })

  it("refuse deux matchs de la même équipe à moins de MATCH_MIN_REST_MINUTES d'écart", async () => {
    const { createMatchAdmin } = await import('./adminMatches')
    const saison = await seedSaison()
    const journee = await seedJournee(saison.id)
    const home = await seedTeam({ nom: 'Home FC' })
    const away = await seedTeam({ nom: 'Away FC' })
    const other = await seedTeam({ nom: 'Other FC' })

    await createMatchAdmin({
      journee_id: journee.id,
      equipe_home: home.id,
      equipe_away: away.id,
      date: '2026-03-01T15:00:00Z',
    })

    // `home` rejoue 30 min plus tard contre une troisième équipe : chevauchement.
    await expect(
      createMatchAdmin({
        journee_id: journee.id,
        equipe_home: home.id,
        equipe_away: other.id,
        date: '2026-03-01T15:30:00Z',
      }),
    ).rejects.toThrow(/Conflit\(s\) de programmation/)
  })

  it("autorise deux matchs de la même équipe au-delà de la fenêtre de repos minimale", async () => {
    const { createMatchAdmin } = await import('./adminMatches')
    process.env.MATCH_MIN_REST_MINUTES = '60'
    const saison = await seedSaison()
    const journee = await seedJournee(saison.id)
    const home = await seedTeam({ nom: 'Home FC' })
    const away = await seedTeam({ nom: 'Away FC' })
    const other = await seedTeam({ nom: 'Other FC' })

    await createMatchAdmin({
      journee_id: journee.id,
      equipe_home: home.id,
      equipe_away: away.id,
      date: '2026-03-01T15:00:00Z',
    })

    const { overriddenConflicts } = await createMatchAdmin({
      journee_id: journee.id,
      equipe_home: home.id,
      equipe_away: other.id,
      date: '2026-03-01T17:00:00Z',
    })

    expect(overriddenConflicts).toEqual([])
  })

  it('refuse deux matchs désignant le même arbitre en même temps', async () => {
    const { createMatchAdmin } = await import('./adminMatches')
    const { Arbitre } = await import('@/lib/entities')
    const saison = await seedSaison()
    const journee = await seedJournee(saison.id)
    const arbitre = await dataSource.getRepository(Arbitre).save({ nom: 'M. Trabelsi' })
    const [a, b, c, d] = await Promise.all([seedTeam(), seedTeam(), seedTeam(), seedTeam()])

    await createMatchAdmin({
      journee_id: journee.id,
      equipe_home: a.id,
      equipe_away: b.id,
      date: '2026-03-01T15:00:00Z',
      arbitre_id: arbitre.id,
    })

    await expect(
      createMatchAdmin({
        journee_id: journee.id,
        equipe_home: c.id,
        equipe_away: d.id,
        date: '2026-03-01T15:45:00Z',
        arbitre_id: arbitre.id,
      }),
    ).rejects.toThrow(/Conflit\(s\) de programmation/)
  })

  it('refuse deux matchs au même stade (stade de l\'équipe qui reçoit) à moins de MATCH_MIN_REST_MINUTES', async () => {
    const { createMatchAdmin } = await import('./adminMatches')
    const saison = await seedSaison()
    const journee = await seedJournee(saison.id)
    const homeA = await seedTeam({ nom: 'Club A', stadium: 'Stade Municipal' })
    const awayA = await seedTeam({ nom: 'Away A' })
    const homeB = await seedTeam({ nom: 'Club B', stadium: 'stade municipal' }) // même stade, casse différente
    const awayB = await seedTeam({ nom: 'Away B' })

    await createMatchAdmin({
      journee_id: journee.id,
      equipe_home: homeA.id,
      equipe_away: awayA.id,
      date: '2026-03-01T15:00:00Z',
    })

    await expect(
      createMatchAdmin({
        journee_id: journee.id,
        equipe_home: homeB.id,
        equipe_away: awayB.id,
        date: '2026-03-01T16:00:00Z',
      }),
    ).rejects.toThrow(/Conflit\(s\) de programmation/)
  })

  it('rejette une date de match hors des bornes de la saison', async () => {
    const { createMatchAdmin } = await import('./adminMatches')
    const saison = await seedSaison({ date_debut: '2025-08-01', date_fin: '2026-05-31' })
    const journee = await seedJournee(saison.id)
    const home = await seedTeam()
    const away = await seedTeam()

    await expect(
      createMatchAdmin({
        journee_id: journee.id,
        equipe_home: home.id,
        equipe_away: away.id,
        date: '2026-07-01T15:00:00Z',
      }),
    ).rejects.toThrow(/dépasse la fin de la saison/)
  })

  it('permet une dérogation motivée qui outrepasse un conflit détecté, et la journalise', async () => {
    const { createMatchAdmin } = await import('./adminMatches')
    const saison = await seedSaison()
    const journee = await seedJournee(saison.id)
    const home = await seedTeam({ nom: 'Home FC' })
    const away = await seedTeam({ nom: 'Away FC' })
    const other = await seedTeam({ nom: 'Other FC' })

    await createMatchAdmin({
      journee_id: journee.id,
      equipe_home: home.id,
      equipe_away: away.id,
      date: '2026-03-01T15:00:00Z',
    })

    const { match, overriddenConflicts } = await createMatchAdmin({
      journee_id: journee.id,
      equipe_home: home.id,
      equipe_away: other.id,
      date: '2026-03-01T15:30:00Z',
      derogation_reason: 'Compétition retardée, accord des deux clubs pour enchaîner les matchs',
    })

    expect(match.id).toBeDefined()
    expect(overriddenConflicts).toHaveLength(1)
    expect(overriddenConflicts[0].type).toBe('team')
  })

  it('rejette une dérogation dont le motif est trop court', async () => {
    const { createMatchAdmin } = await import('./adminMatches')
    const saison = await seedSaison()
    const journee = await seedJournee(saison.id)
    const home = await seedTeam()
    const away = await seedTeam()
    const other = await seedTeam()

    await createMatchAdmin({
      journee_id: journee.id,
      equipe_home: home.id,
      equipe_away: away.id,
      date: '2026-03-01T15:00:00Z',
    })

    await expect(
      createMatchAdmin({
        journee_id: journee.id,
        equipe_home: home.id,
        equipe_away: other.id,
        date: '2026-03-01T15:30:00Z',
        derogation_reason: 'trop bref',
      }),
    ).rejects.toThrow(/Conflit\(s\) de programmation/)
  })

  it('deux créations concurrentes sur la même équipe : une seule réussit, la seconde échoue sans dérogation', async () => {
    const { createMatchAdmin } = await import('./adminMatches')
    const saison = await seedSaison()
    const journee = await seedJournee(saison.id)
    const home = await seedTeam({ nom: 'Home FC' })
    const away = await seedTeam({ nom: 'Away FC' })
    const other = await seedTeam({ nom: 'Other FC' })

    const first = createMatchAdmin({
      journee_id: journee.id,
      equipe_home: home.id,
      equipe_away: away.id,
      date: '2026-03-01T15:00:00Z',
    })
    const second = createMatchAdmin({
      journee_id: journee.id,
      equipe_home: home.id,
      equipe_away: other.id,
      date: '2026-03-01T15:15:00Z',
    })

    const results = await Promise.allSettled([first, second])
    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)

    const matches = await dataSource.getRepository(Match).find({ where: { equipe_home_id: home.id } })
    expect(matches).toHaveLength(1)
  })

  it('bloque le changement d\'équipe une fois la feuille de match signée (pré-match)', async () => {
    const { createMatchAdmin, updateMatchAdmin } = await import('./adminMatches')
    const saison = await seedSaison()
    const journee = await seedJournee(saison.id)
    const home = await seedTeam()
    const away = await seedTeam()
    const replacement = await seedTeam()

    const { match } = await createMatchAdmin({
      journee_id: journee.id,
      equipe_home: home.id,
      equipe_away: away.id,
      date: '2026-03-01T15:00:00Z',
    })
    await dataSource.getRepository(Sheet).save({ matchId: match.id, status: 'PRE_MATCH_SIGNED' })

    await expect(
      updateMatchAdmin(match.id, { equipe_away: replacement.id }),
    ).rejects.toThrow(/feuille de match est déjà préparée\/signée/)
  })

  it("autorise le changement d'équipe tant que la feuille reste en brouillon", async () => {
    const { createMatchAdmin, updateMatchAdmin } = await import('./adminMatches')
    const saison = await seedSaison()
    const journee = await seedJournee(saison.id)
    const home = await seedTeam()
    const away = await seedTeam()
    const replacement = await seedTeam()

    const { match } = await createMatchAdmin({
      journee_id: journee.id,
      equipe_home: home.id,
      equipe_away: away.id,
      date: '2026-03-01T15:00:00Z',
    })
    await dataSource.getRepository(Sheet).save({ matchId: match.id, status: 'DRAFT' })

    const { match: updated } = await updateMatchAdmin(match.id, { equipe_away: replacement.id })
    expect(updated.equipe_away_id).toBe(replacement.id)
  })

  it('ne se bloque pas elle-même : modifier un match ne le compare pas à sa propre ligne', async () => {
    const { createMatchAdmin, updateMatchAdmin } = await import('./adminMatches')
    const saison = await seedSaison()
    const journee = await seedJournee(saison.id)
    const home = await seedTeam()
    const away = await seedTeam()

    const { match } = await createMatchAdmin({
      journee_id: journee.id,
      equipe_home: home.id,
      equipe_away: away.id,
      date: '2026-03-01T15:00:00Z',
    })

    // Repousser le match de 5 minutes ne doit pas se voir opposer un "conflit"
    // avec lui-même (excludeMatchId).
    const { overriddenConflicts } = await updateMatchAdmin(match.id, { date: '2026-03-01T15:05:00Z' })
    expect(overriddenConflicts).toEqual([])
  })
})
