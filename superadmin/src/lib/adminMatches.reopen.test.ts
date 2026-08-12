import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { Federation, League, Saison, Journee, Team, Match, Sheet } from '@/lib/entities'

let dataSource: DataSource

vi.mock('@/lib/db', () => ({
  getDataSource: async () => dataSource,
}))

vi.mock('@/lib/notificationClient', () => ({
  notify: vi.fn(async () => {}),
}))

async function seedFinishedMatchWithClosedSheet(overrides: { matchStatus?: Match['status']; sheetStatus?: Sheet['status'] } = {}) {
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
    status: overrides.matchStatus ?? 'FINISHED',
  })
  const sheet = await dataSource.getRepository(Sheet).save({
    matchId: match.id,
    status: overrides.sheetStatus ?? 'CLOSED',
    closedAt: new Date(),
  })
  return { match, sheet }
}

describe('reopenMatchAdmin (SQLite réel)', () => {
  beforeEach(async () => {
    dataSource = await createTestDataSource()
  })

  afterEach(async () => {
    await dataSource.destroy()
    vi.restoreAllMocks()
  })

  it('remet matches.status et ms_sheets.status à IN_PROGRESS, efface closed_at', async () => {
    const { reopenMatchAdmin } = await import('./adminMatches')
    const { match, sheet } = await seedFinishedMatchWithClosedSheet()

    const result = await reopenMatchAdmin(match.id, 'Erreur de saisie constatée après clôture')

    expect(result).toEqual({ success: true })

    const reloadedMatch = await dataSource.getRepository(Match).findOneOrFail({ where: { id: match.id } })
    expect(reloadedMatch.status).toBe('IN_PROGRESS')

    const reloadedSheet = await dataSource.getRepository(Sheet).findOneOrFail({ where: { id: sheet.id } })
    expect(reloadedSheet.status).toBe('IN_PROGRESS')
    expect(reloadedSheet.closedAt).toBeNull()
  })

  it("refuse de rouvrir un match qui n'est pas FINISHED", async () => {
    const { reopenMatchAdmin } = await import('./adminMatches')
    const { match } = await seedFinishedMatchWithClosedSheet({ matchStatus: 'UPCOMING' })

    await expect(reopenMatchAdmin(match.id, 'motif')).rejects.toThrow(/Impossible de rouvrir/)
  })

  it("refuse de rouvrir un match FINISHED dont la feuille n'est pas CLOSED", async () => {
    const { reopenMatchAdmin } = await import('./adminMatches')
    const { match } = await seedFinishedMatchWithClosedSheet({ sheetStatus: 'IN_PROGRESS' })

    await expect(reopenMatchAdmin(match.id, 'motif')).rejects.toThrow(/Aucune feuille de match clôturée/)
  })

  it('rejette un identifiant de match inconnu', async () => {
    const { reopenMatchAdmin } = await import('./adminMatches')

    await expect(reopenMatchAdmin('00000000-0000-0000-0000-000000000000', 'motif')).rejects.toThrow(/introuvable/)
  })
})
