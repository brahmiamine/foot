import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { MatchSagaStep } from '@/lib/entities/MatchSagaStep'

let dataSource: DataSource

vi.mock('@/lib/db', () => ({
  getDataSource: async () => dataSource,
}))

const cancelMatchTickets = vi.fn()
const cancelMatchConvocations = vi.fn()
vi.mock('@/lib/matchSagaClients', () => ({
  cancelMatchTickets: (matchId: string) => cancelMatchTickets(matchId),
  cancelMatchConvocations: (matchId: string, reason: string) => cancelMatchConvocations(matchId, reason),
}))

beforeEach(async () => {
  dataSource = await createTestDataSource()
  cancelMatchTickets.mockReset()
  cancelMatchConvocations.mockReset()
})

afterEach(async () => {
  await dataSource.destroy()
})

/**
 * TASK-P0-003 (todo.md) : journal de saga d'annulation de match — deux
 * étapes (ticketing, club-hub), chacune journalisée dans
 * MatchSagaStep (append-only), le dossier passant COMPLETED si les deux
 * réussissent, MANUAL_REVIEW sinon.
 */
describe('startMatchCancellationSaga', () => {
  it('marque le dossier COMPLETED quand les deux étapes réussissent', async () => {
    const { startMatchCancellationSaga } = await import('./matchSaga')
    cancelMatchTickets.mockResolvedValue(undefined)
    cancelMatchConvocations.mockResolvedValue(undefined)

    const sagaCase = await startMatchCancellationSaga('match-1', 'Terrain impraticable.', 'admin1')

    expect(sagaCase.status).toBe('COMPLETED')
    expect(sagaCase.saga_type).toBe('CANCEL')
    expect(sagaCase.event_version).toBe(1)

    const steps = await dataSource.getRepository(MatchSagaStep).find({ where: { saga_id: sagaCase.id } })
    expect(steps).toHaveLength(2)
    expect(steps.every((s) => s.status === 'SUCCEEDED')).toBe(true)
  });

  it('marque le dossier MANUAL_REVIEW quand une étape échoue (panne ticketing), sans bloquer l\'autre étape', async () => {
    const { startMatchCancellationSaga } = await import('./matchSaga')
    cancelMatchTickets.mockRejectedValue(new Error('ticketing unreachable'))
    cancelMatchConvocations.mockResolvedValue(undefined)

    const sagaCase = await startMatchCancellationSaga('match-1', 'Terrain impraticable.', 'admin1')

    expect(sagaCase.status).toBe('MANUAL_REVIEW')
    const steps = await dataSource.getRepository(MatchSagaStep).find({ where: { saga_id: sagaCase.id } })
    const ticketingStep = steps.find((s) => s.step === 'BILLETTERIE_TICKETS')
    const clubHubStep = steps.find((s) => s.step === 'TEAMMANAGER_CONVOCATIONS')
    expect(ticketingStep?.status).toBe('FAILED')
    expect(ticketingStep?.error).toContain('ticketing unreachable')
    expect(clubHubStep?.status).toBe('SUCCEEDED')
  });

  it("journalise l'échec des DEUX étapes en cas de panne de service générale", async () => {
    const { startMatchCancellationSaga } = await import('./matchSaga')
    cancelMatchTickets.mockRejectedValue(new Error('network down'))
    cancelMatchConvocations.mockRejectedValue(new Error('network down'))

    const sagaCase = await startMatchCancellationSaga('match-1', 'Terrain impraticable.', 'admin1')

    expect(sagaCase.status).toBe('MANUAL_REVIEW')
    const steps = await dataSource.getRepository(MatchSagaStep).find({ where: { saga_id: sagaCase.id } })
    expect(steps).toHaveLength(2)
    expect(steps.every((s) => s.status === 'FAILED')).toBe(true)
  });
})

describe('retryMatchSaga', () => {
  it('rejoue seulement l\'étape en échec, jamais celle déjà réussie', async () => {
    const { startMatchCancellationSaga, retryMatchSaga } = await import('./matchSaga')
    cancelMatchTickets.mockRejectedValueOnce(new Error('ticketing unreachable'))
    cancelMatchConvocations.mockResolvedValue(undefined)
    const sagaCase = await startMatchCancellationSaga('match-1', 'Terrain impraticable.', 'admin1')
    expect(sagaCase.status).toBe('MANUAL_REVIEW')

    cancelMatchTickets.mockReset()
    cancelMatchConvocations.mockReset()
    cancelMatchTickets.mockResolvedValue(undefined)

    const retried = await retryMatchSaga(sagaCase.id)

    expect(retried.status).toBe('COMPLETED')
    expect(cancelMatchTickets).toHaveBeenCalledTimes(1)
    expect(cancelMatchConvocations).not.toHaveBeenCalled(); // déjà SUCCEEDED, jamais rejouée

    const steps = await dataSource
      .getRepository(MatchSagaStep)
      .find({ where: { saga_id: sagaCase.id }, order: { created_at: 'ASC' } })
    const ticketingSteps = steps.filter((s) => s.step === 'BILLETTERIE_TICKETS')
    expect(ticketingSteps).toHaveLength(2); // attempt 1 (FAILED) + attempt 2 (SUCCEEDED) — append-only
    expect(ticketingSteps[0].attempt).toBe(1)
    expect(ticketingSteps[1].attempt).toBe(2)
  });

  it('rejette un rejeu sur un dossier qui n\'est pas MANUAL_REVIEW', async () => {
    const { startMatchCancellationSaga, retryMatchSaga } = await import('./matchSaga')
    cancelMatchTickets.mockResolvedValue(undefined)
    cancelMatchConvocations.mockResolvedValue(undefined)
    const sagaCase = await startMatchCancellationSaga('match-1', 'Terrain impraticable.', 'admin1')
    expect(sagaCase.status).toBe('COMPLETED')

    await expect(retryMatchSaga(sagaCase.id)).rejects.toThrow('MANUAL_REVIEW')
  });

  it('un rejeu qui échoue à nouveau reste MANUAL_REVIEW, avec l\'erreur mise à jour', async () => {
    const { startMatchCancellationSaga, retryMatchSaga } = await import('./matchSaga')
    cancelMatchTickets.mockRejectedValue(new Error('ticketing unreachable'))
    cancelMatchConvocations.mockResolvedValue(undefined)
    const sagaCase = await startMatchCancellationSaga('match-1', 'Terrain impraticable.', 'admin1')

    cancelMatchTickets.mockRejectedValue(new Error('ticketing still down'))
    const retried = await retryMatchSaga(sagaCase.id)

    expect(retried.status).toBe('MANUAL_REVIEW')
    const steps = await dataSource
      .getRepository(MatchSagaStep)
      .find({ where: { saga_id: sagaCase.id, step: 'BILLETTERIE_TICKETS' }, order: { created_at: 'ASC' } })
    expect(steps).toHaveLength(2)
    expect(steps[1].error).toContain('ticketing still down')
  });

  it('throws for an unknown saga id', async () => {
    const { retryMatchSaga } = await import('./matchSaga')
    await expect(retryMatchSaga('does-not-exist')).rejects.toThrow('introuvable')
  });
})

describe('listMatchSagas / getMatchSagaSteps', () => {
  it('filtre par statut et trie par date décroissante', async () => {
    const { startMatchCancellationSaga, listMatchSagas } = await import('./matchSaga')
    cancelMatchTickets.mockResolvedValue(undefined)
    cancelMatchConvocations.mockResolvedValue(undefined)
    await startMatchCancellationSaga('match-1', 'r1', null)

    cancelMatchTickets.mockRejectedValue(new Error('down'))
    await startMatchCancellationSaga('match-2', 'r2', null)

    const manualReview = await listMatchSagas('MANUAL_REVIEW')
    expect(manualReview).toHaveLength(1)
    expect(manualReview[0].match_id).toBe('match-2')

    const all = await listMatchSagas()
    expect(all).toHaveLength(2)
  });

  it('retourne les étapes dans l\'ordre chronologique', async () => {
    const { startMatchCancellationSaga, getMatchSagaSteps } = await import('./matchSaga')
    cancelMatchTickets.mockResolvedValue(undefined)
    cancelMatchConvocations.mockResolvedValue(undefined)
    const sagaCase = await startMatchCancellationSaga('match-1', 'r1', null)

    const steps = await getMatchSagaSteps(sagaCase.id)
    expect(steps.map((s) => s.step)).toEqual(['BILLETTERIE_TICKETS', 'TEAMMANAGER_CONVOCATIONS'])
  });
})
