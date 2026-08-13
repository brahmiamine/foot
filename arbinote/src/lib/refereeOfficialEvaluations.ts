import { getDataSource } from './db'
import { RefereeOfficialEvaluation, type RefereeOfficialEvaluationStatus } from './entities'

/**
 * migration.md §12 (Phase 5) : évaluation fédérale OFFICIELLE d'un arbitre.
 * Domaine strictement séparé de la notation publique — ce fichier
 * n'importe jamais `adminVotes.ts`/`Vote` et ne calcule jamais de score
 * combiné entre `note_officielle` et `votes.note_globale`.
 */
export class RefereeOfficialEvaluationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RefereeOfficialEvaluationError'
  }
}

export interface CreateEvaluationInput {
  matchId: string
  arbitreId: string
  observerUserId: string
  criteres: Record<string, number>
  noteOfficielle: number
  pointsForts?: string | null
  pointsFaibles?: string | null
  recommandations?: string | null
}

/** Crée un rapport DRAFT — modifiable jusqu'à sa soumission (submit). */
export async function createEvaluation(input: CreateEvaluationInput): Promise<RefereeOfficialEvaluation> {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository(RefereeOfficialEvaluation)

  const existing = await repo.findOne({
    where: { match_id: input.matchId, arbitre_id: input.arbitreId, observer_user_id: input.observerUserId },
  })
  if (existing) {
    throw new RefereeOfficialEvaluationError('Une évaluation existe déjà pour cet observateur, cet arbitre et ce match')
  }

  const evaluation = repo.create({
    match_id: input.matchId,
    arbitre_id: input.arbitreId,
    observer_user_id: input.observerUserId,
    criteres: input.criteres,
    note_officielle: input.noteOfficielle,
    points_forts: input.pointsForts ?? null,
    points_faibles: input.pointsFaibles ?? null,
    recommandations: input.recommandations ?? null,
    status: 'DRAFT',
  })
  return repo.save(evaluation)
}

function assertTransition(current: RefereeOfficialEvaluationStatus, allowed: RefereeOfficialEvaluationStatus[]): void {
  if (!allowed.includes(current)) {
    throw new RefereeOfficialEvaluationError(`Transition invalide depuis le statut ${current}`)
  }
}

/** DRAFT -> SUBMITTED. Seul l'observateur auteur du rapport peut le soumettre (vérifié par l'appelant, voir routes). */
export async function submitEvaluation(evaluationId: string): Promise<RefereeOfficialEvaluation> {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository(RefereeOfficialEvaluation)
  const evaluation = await repo.findOne({ where: { id: evaluationId } })
  if (!evaluation) {
    throw new RefereeOfficialEvaluationError('Évaluation introuvable')
  }
  assertTransition(evaluation.status, ['DRAFT'])
  evaluation.status = 'SUBMITTED'
  evaluation.submitted_at = new Date()
  return repo.save(evaluation)
}

/** SUBMITTED -> VALIDATED (homologation fédérale, migration.md §9). */
export async function validateEvaluation(evaluationId: string, validatedBy: string): Promise<RefereeOfficialEvaluation> {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository(RefereeOfficialEvaluation)
  const evaluation = await repo.findOne({ where: { id: evaluationId } })
  if (!evaluation) {
    throw new RefereeOfficialEvaluationError('Évaluation introuvable')
  }
  assertTransition(evaluation.status, ['SUBMITTED'])
  evaluation.status = 'VALIDATED'
  evaluation.validated_by = validatedBy
  evaluation.validated_at = new Date()
  return repo.save(evaluation)
}

/** SUBMITTED -> REJECTED (renvoyé pour révision par la fédération). */
export async function rejectEvaluation(
  evaluationId: string,
  validatedBy: string,
  reason: string,
): Promise<RefereeOfficialEvaluation> {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository(RefereeOfficialEvaluation)
  const evaluation = await repo.findOne({ where: { id: evaluationId } })
  if (!evaluation) {
    throw new RefereeOfficialEvaluationError('Évaluation introuvable')
  }
  assertTransition(evaluation.status, ['SUBMITTED'])
  evaluation.status = 'REJECTED'
  evaluation.validated_by = validatedBy
  evaluation.validated_at = new Date()
  evaluation.rejection_reason = reason
  return repo.save(evaluation)
}

export async function getEvaluationById(evaluationId: string): Promise<RefereeOfficialEvaluation | null> {
  const dataSource = await getDataSource()
  return dataSource.getRepository(RefereeOfficialEvaluation).findOne({ where: { id: evaluationId } })
}

/** Historique complet (tous statuts) d'un arbitre — migration.md §12 "historique par arbitre". */
export async function listEvaluationsForArbitre(arbitreId: string): Promise<RefereeOfficialEvaluation[]> {
  const dataSource = await getDataSource()
  return dataSource
    .getRepository(RefereeOfficialEvaluation)
    .find({ where: { arbitre_id: arbitreId }, order: { created_at: 'DESC' } })
}

export interface RefereeOfficialStats {
  evaluationCount: number
  averageNoteOfficielle: number | null
}

/**
 * Statistiques de performance — migration.md §12 "aide aux promotions/
 * désignations/formations". Uniquement sur les évaluations VALIDATED : un
 * rapport encore DRAFT/SUBMITTED n'est pas une vérité homologuée, et un
 * rapport REJECTED ne doit jamais compter dans la moyenne d'un arbitre.
 */
export async function getRefereeOfficialStats(arbitreId: string): Promise<RefereeOfficialStats> {
  const dataSource = await getDataSource()
  const evaluations = await dataSource
    .getRepository(RefereeOfficialEvaluation)
    .find({ where: { arbitre_id: arbitreId, status: 'VALIDATED' } })

  if (evaluations.length === 0) {
    return { evaluationCount: 0, averageNoteOfficielle: null }
  }

  const sum = evaluations.reduce((total, evaluation) => total + Number(evaluation.note_officielle), 0)
  return {
    evaluationCount: evaluations.length,
    averageNoteOfficielle: Math.round((sum / evaluations.length) * 100) / 100,
  }
}
