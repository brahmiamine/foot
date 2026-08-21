import { getDataSource } from './db'
import { RefereeOfficialEvaluation, type RefereeOfficialEvaluationStatus } from './entities'
import { getMatchScope } from './matchFederationScope'

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
  evaluatorRole?: string
  federationId?: string
  leagueId?: string
  criteres: Record<string, number>
  /** REF-007 — instant de résolution du barème utilisé, figé pour toute la vie du rapport (défaut : maintenant). */
  criteriaEffectiveAt?: Date
  noteOfficielle: number
  pointsForts?: string | null
  pointsFaibles?: string | null
  recommandations?: string | null
  privateComment?: string | null
}

/** Crée un rapport DRAFT — modifiable jusqu'à sa soumission (submit). */
export async function createEvaluation(input: CreateEvaluationInput): Promise<RefereeOfficialEvaluation> {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository(RefereeOfficialEvaluation)
  const derivedScope = await getMatchScope(dataSource, input.matchId)
  const federationId = input.federationId ?? derivedScope?.federationId
  const leagueId = input.leagueId ?? derivedScope?.leagueId
  if (!federationId || !leagueId) {
    throw new RefereeOfficialEvaluationError('Le match ne possède pas de scope fédération/ligue valide')
  }

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
    evaluator_role: input.evaluatorRole ?? 'REFEREE_OBSERVER',
    federation_id: federationId,
    league_id: leagueId,
    criteres: input.criteres,
    criteria_effective_at: input.criteriaEffectiveAt ?? new Date(),
    note_officielle: input.noteOfficielle,
    points_forts: input.pointsForts ?? null,
    points_faibles: input.pointsFaibles ?? null,
    recommandations: input.recommandations ?? null,
    private_comment: input.privateComment ?? null,
    status: 'DRAFT',
  })
  return repo.save(evaluation)
}

function assertTransition(current: RefereeOfficialEvaluationStatus, allowed: RefereeOfficialEvaluationStatus[]): void {
  if (!allowed.includes(current)) {
    throw new RefereeOfficialEvaluationError(`Transition invalide depuis le statut ${current}`)
  }
}

export interface UpdateEvaluationInput {
  criteres?: Record<string, number>
  noteOfficielle?: number
  pointsForts?: string | null
  pointsFaibles?: string | null
  recommandations?: string | null
  privateComment?: string | null
}

/**
 * Corrige un rapport avant sa soumission — seul un `DRAFT` est modifiable
 * (une fois `SUBMITTED`, le rapport est figé jusqu'à la décision fédérale ;
 * un `REJECTED` doit être recréé, pas réédité, pour garder une trace de ce
 * qui a été effectivement homologué/rejeté). Autorisation (auteur du
 * rapport) vérifiée par l'appelant, comme pour `submitEvaluation`.
 */
export async function updateEvaluation(evaluationId: string, input: UpdateEvaluationInput): Promise<RefereeOfficialEvaluation> {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository(RefereeOfficialEvaluation)
  const evaluation = await repo.findOne({ where: { id: evaluationId } })
  if (!evaluation) {
    throw new RefereeOfficialEvaluationError('Évaluation introuvable')
  }
  assertTransition(evaluation.status, ['DRAFT'])

  if (input.criteres !== undefined) evaluation.criteres = input.criteres
  if (input.noteOfficielle !== undefined) evaluation.note_officielle = input.noteOfficielle
  if (input.pointsForts !== undefined) evaluation.points_forts = input.pointsForts
  if (input.pointsFaibles !== undefined) evaluation.points_faibles = input.pointsFaibles
  if (input.recommandations !== undefined) evaluation.recommandations = input.recommandations
  if (input.privateComment !== undefined) evaluation.private_comment = input.privateComment

  return repo.save(evaluation)
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
  const transition = await repo.update(
    { id: evaluationId, status: 'DRAFT' },
    { status: 'SUBMITTED', submitted_at: new Date() },
  )
  if (transition.affected !== 1) {
    throw new RefereeOfficialEvaluationError('Le rapport a déjà changé de statut')
  }
  return (await repo.findOne({ where: { id: evaluationId } }))!
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
  const transition = await repo.update(
    { id: evaluationId, status: 'SUBMITTED' },
    { status: 'VALIDATED', validated_by: validatedBy, validated_at: new Date() },
  )
  if (transition.affected !== 1) {
    throw new RefereeOfficialEvaluationError('Le rapport a déjà été traité')
  }
  return (await repo.findOne({ where: { id: evaluationId } }))!
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
  const transition = await repo.update(
    { id: evaluationId, status: 'SUBMITTED' },
    {
      status: 'REJECTED',
      validated_by: validatedBy,
      validated_at: new Date(),
      rejection_reason: reason,
    },
  )
  if (transition.affected !== 1) {
    throw new RefereeOfficialEvaluationError('Le rapport a déjà été traité')
  }
  return (await repo.findOne({ where: { id: evaluationId } }))!
}

export async function getEvaluationById(evaluationId: string): Promise<RefereeOfficialEvaluation | null> {
  const dataSource = await getDataSource()
  return dataSource.getRepository(RefereeOfficialEvaluation).findOne({ where: { id: evaluationId } })
}

/** Historique complet (tous statuts) d'un arbitre — migration.md §12 "historique par arbitre". */
export async function listEvaluationsForArbitre(
  arbitreId: string,
  scope: { federationId?: string | null; leagueId?: string | null } = {},
): Promise<RefereeOfficialEvaluation[]> {
  const dataSource = await getDataSource()
  const qb = dataSource.getRepository(RefereeOfficialEvaluation)
    .createQueryBuilder('evaluation')
    .where('evaluation.arbitre_id = :arbitreId', { arbitreId })
    .orderBy('evaluation.created_at', 'DESC')
  if (scope.leagueId) qb.andWhere('evaluation.league_id = :leagueId', { leagueId: scope.leagueId })
  if (scope.federationId) qb.andWhere('evaluation.federation_id = :federationId', { federationId: scope.federationId })
  return qb.getMany()
}

/** Rapports rédigés par un observateur (tous statuts, y compris DRAFT à finaliser) — écran officiel §12. */
export async function listEvaluationsForObserver(observerUserId: string): Promise<RefereeOfficialEvaluation[]> {
  const dataSource = await getDataSource()
  return dataSource
    .getRepository(RefereeOfficialEvaluation)
    .find({ where: { observer_user_id: observerUserId }, order: { created_at: 'DESC' } })
}

/**
 * File d'homologation (rapports SUBMITTED) pour un `FEDERATION_ADMIN` —
 * jointure match → journée → saison → ligue pour ne retourner que les
 * rapports dont le match est RÉELLEMENT gouverné par cette fédération
 * (même logique que `getMatchFederationId`, appliquée en filtre de
 * liste). `federationId` nul (PLATFORM_SUPERADMIN) retourne tous les
 * rapports SUBMITTED, sans filtre de fédération.
 */
export async function listEvaluationsPendingReview(scope: { federationId?: string | null; leagueId?: string | null } = {}): Promise<RefereeOfficialEvaluation[]> {
  const dataSource = await getDataSource()
  const qb = dataSource
    .getRepository(RefereeOfficialEvaluation)
    .createQueryBuilder('evaluation')
    .where('evaluation.status = :status', { status: 'SUBMITTED' })
    .orderBy('evaluation.submitted_at', 'ASC')

  if (scope.federationId) qb.andWhere('evaluation.federation_id = :federationId', { federationId: scope.federationId })
  if (scope.leagueId) qb.andWhere('evaluation.league_id = :leagueId', { leagueId: scope.leagueId })

  return qb.getMany()
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
