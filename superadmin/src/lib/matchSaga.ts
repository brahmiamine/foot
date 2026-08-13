import { getDataSource } from './db'
import { MatchSagaCase, MatchSagaStatus } from './entities/MatchSagaCase'
import { MatchSagaStep, MatchSagaStepName } from './entities/MatchSagaStep'
import { cancelMatchConvocations, cancelMatchTickets } from './matchSagaClients'

const CANCEL_STEPS: MatchSagaStepName[] = ['BILLETTERIE_TICKETS', 'TEAMMANAGER_CONVOCATIONS']

/**
 * TASK-P0-003 (todo.md). Journal de saga pour l'annulation d'un match :
 * `matches.status` a déjà basculé à CANCELLED de façon synchrone et
 * inconditionnelle avant d'appeler cette fonction (voir cancelMatchAdmin,
 * seul appelant) — rien ici ne peut annuler ou retarder cette écriture,
 * la saga ne fait que compenser côté billetterie/teamManager ensuite et
 * consigner le résultat. Chaque étape (fermeture vente + remboursement
 * billetterie, annulation convocations teamManager) est tentée une fois
 * ici (le client HTTP retente déjà 3 fois sur échec réseau, voir
 * matchSagaClients.ts) et son issue est journalisée dans MatchSagaStep,
 * append-only. Le dossier passe MANUAL_REVIEW si au moins une étape a
 * échoué — rejouable par un opérateur (voir retryMatchSaga) ou convergé
 * indépendamment par le scheduler autonome de l'app concernée
 * (billetterie/teamManager lisent `matches.status` directement, ce
 * dossier n'est pas leur seule voie de rattrapage).
 */
async function runStep(
  sagaId: string,
  step: MatchSagaStepName,
  matchId: string,
  reason: string,
  attempt: number,
): Promise<boolean> {
  const dataSource = await getDataSource()
  const stepRepo = dataSource.getRepository(MatchSagaStep)

  try {
    if (step === 'BILLETTERIE_TICKETS') {
      await cancelMatchTickets(matchId)
    } else {
      await cancelMatchConvocations(matchId, reason)
    }
    await stepRepo.save(stepRepo.create({ saga_id: sagaId, step, status: 'SUCCEEDED', attempt, error: null }))
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await stepRepo.save(stepRepo.create({ saga_id: sagaId, step, status: 'FAILED', attempt, error: message }))
    console.error(`[match-saga] step ${step} failed for match ${matchId} (attempt ${attempt}): ${message}`)
    return false
  }
}

export async function startMatchCancellationSaga(
  matchId: string,
  reason: string,
  initiatedBy: string | null,
): Promise<MatchSagaCase> {
  const dataSource = await getDataSource()
  const caseRepo = dataSource.getRepository(MatchSagaCase)

  const sagaCase = await caseRepo.save(
    caseRepo.create({
      match_id: matchId,
      saga_type: 'CANCEL',
      event_version: 1,
      reason,
      status: 'IN_PROGRESS',
      initiated_by: initiatedBy,
    }),
  )

  let allSucceeded = true
  for (const step of CANCEL_STEPS) {
    const ok = await runStep(sagaCase.id, step, matchId, reason, 1)
    if (!ok) allSucceeded = false
  }

  sagaCase.status = allSucceeded ? 'COMPLETED' : 'MANUAL_REVIEW'
  return caseRepo.save(sagaCase)
}

/**
 * Intervention manuelle (critère TASK-P0-003) : ne rejoue que les étapes
 * dont la dernière tentative connue a échoué — une étape déjà SUCCEEDED
 * n'est jamais réappelée (billetterie/teamManager sont idempotents de
 * toute façon, mais éviter l'appel réseau superflu reste préférable).
 */
export async function retryMatchSaga(sagaId: string): Promise<MatchSagaCase> {
  const dataSource = await getDataSource()
  const caseRepo = dataSource.getRepository(MatchSagaCase)
  const stepRepo = dataSource.getRepository(MatchSagaStep)

  const sagaCase = await caseRepo.findOne({ where: { id: sagaId } })
  if (!sagaCase) throw new Error('Dossier de saga introuvable')
  if (sagaCase.status !== 'MANUAL_REVIEW') {
    throw new Error(`Rejeu impossible : dossier au statut ${sagaCase.status} (attendu MANUAL_REVIEW)`)
  }

  const allSteps = await stepRepo.find({ where: { saga_id: sagaId }, order: { created_at: 'ASC' } })
  const lastByStep = new Map<MatchSagaStepName, { status: string; attempt: number }>()
  for (const s of allSteps) lastByStep.set(s.step, { status: s.status, attempt: s.attempt })

  let allSucceeded = true
  for (const step of CANCEL_STEPS) {
    const last = lastByStep.get(step)
    if (last?.status === 'SUCCEEDED') continue
    const ok = await runStep(sagaCase.id, step, sagaCase.match_id, sagaCase.reason, (last?.attempt ?? 0) + 1)
    if (!ok) allSucceeded = false
  }

  sagaCase.status = allSucceeded ? 'COMPLETED' : 'MANUAL_REVIEW'
  return caseRepo.save(sagaCase)
}

export async function listMatchSagas(status?: MatchSagaStatus): Promise<MatchSagaCase[]> {
  const dataSource = await getDataSource()
  const caseRepo = dataSource.getRepository(MatchSagaCase)
  return caseRepo.find({ where: status ? { status } : {}, order: { created_at: 'DESC' } })
}

export async function getMatchSagaSteps(sagaId: string): Promise<MatchSagaStep[]> {
  const dataSource = await getDataSource()
  return dataSource.getRepository(MatchSagaStep).find({ where: { saga_id: sagaId }, order: { created_at: 'ASC' } })
}
