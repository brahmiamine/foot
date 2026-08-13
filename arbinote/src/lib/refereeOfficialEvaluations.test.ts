import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { seedBaseGraph } from '@/test/fixtures'
import { Match } from '@/lib/entities'

let dataSource: DataSource

vi.mock('./db', () => ({
  getDataSource: async () => dataSource,
}))

beforeEach(async () => {
  dataSource = await createTestDataSource()
})

afterEach(async () => {
  await dataSource.destroy()
})

/** migration.md §12 (Phase 5) : évaluation fédérale officielle, séparée de la notation publique. */
describe('refereeOfficialEvaluations', () => {
  describe('createEvaluation', () => {
    it('creates a DRAFT evaluation', async () => {
      const { createEvaluation } = await import('./refereeOfficialEvaluations')
      const { match, arbitre } = await seedBaseGraph(dataSource)

      const evaluation = await createEvaluation({
        matchId: match.id,
        arbitreId: arbitre.id,
        observerUserId: 'observer-1',
        criteres: { decisions_cles: 8, gestion_match: 7 },
        noteOfficielle: 7.5,
      })

      expect(evaluation.status).toBe('DRAFT')
      expect(evaluation.note_officielle).toBeCloseTo(7.5)
    })

    it('rejects a duplicate report from the same observer for the same match/arbitre', async () => {
      const { createEvaluation, RefereeOfficialEvaluationError } = await import('./refereeOfficialEvaluations')
      const { match, arbitre } = await seedBaseGraph(dataSource)

      await createEvaluation({
        matchId: match.id,
        arbitreId: arbitre.id,
        observerUserId: 'observer-1',
        criteres: {},
        noteOfficielle: 7,
      })

      await expect(
        createEvaluation({
          matchId: match.id,
          arbitreId: arbitre.id,
          observerUserId: 'observer-1',
          criteres: {},
          noteOfficielle: 8,
        }),
      ).rejects.toThrow(RefereeOfficialEvaluationError)
    })

    it('allows two different observers to evaluate the same referee on the same match', async () => {
      const { createEvaluation, listEvaluationsForArbitre } = await import('./refereeOfficialEvaluations')
      const { match, arbitre } = await seedBaseGraph(dataSource)

      await createEvaluation({ matchId: match.id, arbitreId: arbitre.id, observerUserId: 'observer-1', criteres: {}, noteOfficielle: 7 })
      await createEvaluation({ matchId: match.id, arbitreId: arbitre.id, observerUserId: 'observer-2', criteres: {}, noteOfficielle: 6 })

      expect(await listEvaluationsForArbitre(arbitre.id)).toHaveLength(2)
    })
  })

  describe('workflow DRAFT -> SUBMITTED -> VALIDATED/REJECTED', () => {
    it('follows the full validation path', async () => {
      const { createEvaluation, submitEvaluation, validateEvaluation } = await import('./refereeOfficialEvaluations')
      const { match, arbitre } = await seedBaseGraph(dataSource)

      const created = await createEvaluation({ matchId: match.id, arbitreId: arbitre.id, observerUserId: 'observer-1', criteres: {}, noteOfficielle: 7 })
      const submitted = await submitEvaluation(created.id)
      expect(submitted.status).toBe('SUBMITTED')
      expect(submitted.submitted_at).not.toBeNull()

      const validated = await validateEvaluation(created.id, 'federation-admin@example.com')
      expect(validated.status).toBe('VALIDATED')
      expect(validated.validated_by).toBe('federation-admin@example.com')
    })

    it('follows the rejection path with a reason', async () => {
      const { createEvaluation, submitEvaluation, rejectEvaluation } = await import('./refereeOfficialEvaluations')
      const { match, arbitre } = await seedBaseGraph(dataSource)

      const created = await createEvaluation({ matchId: match.id, arbitreId: arbitre.id, observerUserId: 'observer-1', criteres: {}, noteOfficielle: 7 })
      await submitEvaluation(created.id)

      const rejected = await rejectEvaluation(created.id, 'federation-admin@example.com', 'Rapport incomplet')
      expect(rejected.status).toBe('REJECTED')
      expect(rejected.rejection_reason).toBe('Rapport incomplet')
    })

    it('cannot validate a DRAFT evaluation that has not been submitted', async () => {
      const { createEvaluation, validateEvaluation, RefereeOfficialEvaluationError } = await import('./refereeOfficialEvaluations')
      const { match, arbitre } = await seedBaseGraph(dataSource)

      const created = await createEvaluation({ matchId: match.id, arbitreId: arbitre.id, observerUserId: 'observer-1', criteres: {}, noteOfficielle: 7 })

      await expect(validateEvaluation(created.id, 'federation-admin@example.com')).rejects.toThrow(RefereeOfficialEvaluationError)
    })

    it('cannot re-validate an already VALIDATED evaluation', async () => {
      const { createEvaluation, submitEvaluation, validateEvaluation, RefereeOfficialEvaluationError } = await import('./refereeOfficialEvaluations')
      const { match, arbitre } = await seedBaseGraph(dataSource)

      const created = await createEvaluation({ matchId: match.id, arbitreId: arbitre.id, observerUserId: 'observer-1', criteres: {}, noteOfficielle: 7 })
      await submitEvaluation(created.id)
      await validateEvaluation(created.id, 'federation-admin@example.com')

      await expect(validateEvaluation(created.id, 'federation-admin@example.com')).rejects.toThrow(RefereeOfficialEvaluationError)
    })
  })

  describe('getRefereeOfficialStats', () => {
    it('only counts VALIDATED evaluations in the average (never DRAFT/SUBMITTED/REJECTED)', async () => {
      const { createEvaluation, submitEvaluation, validateEvaluation, rejectEvaluation, getRefereeOfficialStats } = await import(
        './refereeOfficialEvaluations'
      )
      const { match, arbitre, journee, homeTeam, awayTeam } = await seedBaseGraph(dataSource)
      const matchRepo = dataSource.getRepository(Match)
      const seedOtherMatch = () =>
        matchRepo.save(matchRepo.create({ journee_id: journee.id, equipe_home_id: homeTeam.id, equipe_away_id: awayTeam.id, date: new Date() }))

      const validated1 = await createEvaluation({ matchId: match.id, arbitreId: arbitre.id, observerUserId: 'observer-1', criteres: {}, noteOfficielle: 8 })
      await submitEvaluation(validated1.id)
      await validateEvaluation(validated1.id, 'federation-admin@example.com')

      const match2 = await seedOtherMatch()
      const validated2 = await createEvaluation({ matchId: match2.id, arbitreId: arbitre.id, observerUserId: 'observer-2', criteres: {}, noteOfficielle: 6 })
      await submitEvaluation(validated2.id)
      await validateEvaluation(validated2.id, 'federation-admin@example.com')

      const match3 = await seedOtherMatch()
      const rejected = await createEvaluation({ matchId: match3.id, arbitreId: arbitre.id, observerUserId: 'observer-3', criteres: {}, noteOfficielle: 2 })
      await submitEvaluation(rejected.id)
      await rejectEvaluation(rejected.id, 'federation-admin@example.com', 'Rapport incomplet')

      const match4 = await seedOtherMatch()
      await createEvaluation({ matchId: match4.id, arbitreId: arbitre.id, observerUserId: 'observer-4', criteres: {}, noteOfficielle: 10 })

      const stats = await getRefereeOfficialStats(arbitre.id)
      expect(stats.evaluationCount).toBe(2)
      expect(stats.averageNoteOfficielle).toBeCloseTo(7)
    })

    it('returns null average when the referee has no validated evaluation', async () => {
      const { getRefereeOfficialStats } = await import('./refereeOfficialEvaluations')
      const { arbitre } = await seedBaseGraph(dataSource)

      const stats = await getRefereeOfficialStats(arbitre.id)
      expect(stats).toEqual({ evaluationCount: 0, averageNoteOfficielle: null })
    })
  })
})
