import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { AppealWorkflowError, assertAppealTransition, type AppealApplicantType, type AppealSourceType, type AppealStatus } from '../../../packages/regulatory-shared/src/appeals'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { Appeal, AppealDocument, AppealEvent, DisciplinaryCase, LegalCase, Team } from './entities'
import { notify } from './notificationClient'

export interface AppealAuditContext { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null }
export interface AppealFilters { federationId?: string; leagueId?: string; status?: AppealStatus; sourceType?: AppealSourceType; applicantType?: AppealApplicantType; applicantId?: string }
export interface AppealInput { federationId?: string; leagueId?: string | null; sourceType: AppealSourceType; sourceId: string; applicantType: AppealApplicantType; applicantId: string; grounds: string }

export class AppealAuthorizationError extends Error { constructor() { super('Forbidden'); this.name = 'AppealAuthorizationError' } }

function assertAccess(session: SsoUser, item: Appeal): void {
  if (canAccessPlatform(session) || canAccessFederation(session, item.federationId) || (item.leagueId && canAccessLeague(session, item.leagueId, item.federationId))) return
  throw new AppealAuthorizationError()
}

function applyScope(query: SelectQueryBuilder<Appeal>, session: SsoUser): void {
  if (canAccessPlatform(session)) return
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) { query.andWhere('item.federation_id = :federationId', { federationId: session.federationId }); return }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) { query.andWhere('item.league_id = :leagueId', { leagueId: session.leagueId }); return }
  query.andWhere('1 = 0')
}

async function saveEvent(manager: EntityManager, appealId: string, audit: AppealAuditContext, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(AppealEvent)
  await repo.save(repo.create({ appealId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: audit.userId, actorRole: audit.role, reason: input.reason ?? null, afterValue: input.afterValue ?? null, ipAddress: audit.ipAddress ?? null, userAgent: audit.userAgent ?? null }))
}

/**
 * Marque au mieux la décision d'origine comme APPEALED lorsqu'un appel est
 * déposé contre elle — jamais l'inverse (l'appel ne réécrit ni ne supprime
 * l'historique de la décision, il ajoute seulement une transition de
 * statut déjà prévue par le workflow de ce domaine). Silencieux si le
 * domaine n'est pas concerné ou si la source n'est pas dans un état où
 * APPEALED est une transition valide.
 */
async function markSourceAppealed(manager: EntityManager, sourceType: AppealSourceType, sourceId: string): Promise<void> {
  if (sourceType === 'LEGAL_CASE') {
    const repo = manager.getRepository(LegalCase)
    const item = await repo.findOne({ where: { id: sourceId } })
    if (item && item.status === 'DECIDED') { item.status = 'APPEALED'; await repo.save(item) }
  }
  if (sourceType === 'DISCIPLINARY_CASE') {
    const repo = manager.getRepository(DisciplinaryCase)
    const item = await repo.findOne({ where: { id: sourceId } })
    if (item && item.status === 'DECIDED') { item.status = 'APPEALED'; await repo.save(item) }
  }
}

export async function listAppeals(dataSource: DataSource, session: SsoUser, filters: AppealFilters = {}) {
  const query = dataSource.getRepository(Appeal).createQueryBuilder('item').orderBy('item.submitted_at', 'DESC')
  applyScope(query, session)
  if (filters.federationId) query.andWhere('item.federation_id = :filterFederationId', { filterFederationId: filters.federationId })
  if (filters.leagueId) query.andWhere('item.league_id = :filterLeagueId', { filterLeagueId: filters.leagueId })
  if (filters.status) query.andWhere('item.status = :status', { status: filters.status })
  if (filters.sourceType) query.andWhere('item.source_type = :sourceType', { sourceType: filters.sourceType })
  if (filters.applicantType && filters.applicantId) query.andWhere('item.applicant_type = :applicantType AND item.applicant_id = :applicantId', { applicantType: filters.applicantType, applicantId: filters.applicantId })
  const rows = await query.getMany()
  const clubIds = [...new Set(rows.flatMap((item) => item.applicantType === 'CLUB' ? [item.applicantId] : []))]
  const clubs = clubIds.length ? await dataSource.getRepository(Team).createQueryBuilder('club').where('club.id IN (:...ids)', { ids: clubIds }).getMany() : []
  const clubNames = new Map(clubs.map((item) => [item.id, item.nom]))
  return rows.map((item) => Object.assign(item, { applicantName: item.applicantType === 'CLUB' ? (clubNames.get(item.applicantId) ?? item.applicantId) : item.applicantId }))
}

export async function getAppealBundle(dataSource: DataSource, session: SsoUser, id: string) {
  const item = await dataSource.getRepository(Appeal).findOne({ where: { id } })
  if (!item) throw new AppealWorkflowError('Appel introuvable')
  assertAccess(session, item)
  const [documents, events, rows] = await Promise.all([
    dataSource.getRepository(AppealDocument).find({ where: { appealId: id }, order: { uploadedAt: 'DESC' } }),
    dataSource.getRepository(AppealEvent).find({ where: { appealId: id }, order: { createdAt: 'DESC' } }),
    listAppeals(dataSource, session, {}),
  ])
  return { appeal: rows.find((row) => row.id === id) ?? item, documents, events }
}

export async function submitAppeal(dataSource: DataSource, session: SsoUser, audit: AppealAuditContext, input: AppealInput): Promise<Appeal> {
  if (!input.grounds?.trim()) throw new AppealWorkflowError("Les motifs de l'appel sont obligatoires")
  return dataSource.transaction(async (manager) => {
    const federationId = input.federationId ?? session.federationId ?? undefined
    if (!federationId) throw new AppealWorkflowError('Impossible de déterminer la fédération compétente')
    if (!canAccessPlatform(session) && !canAccessFederation(session, federationId) && !(input.leagueId && canAccessLeague(session, input.leagueId, federationId))) throw new AppealAuthorizationError()
    const repo = manager.getRepository(Appeal)
    const appeal = await repo.save(repo.create({ federationId, leagueId: input.leagueId ?? null, sourceType: input.sourceType, sourceId: input.sourceId, applicantType: input.applicantType, applicantId: input.applicantId, grounds: input.grounds.trim(), submittedAt: new Date(), status: 'SUBMITTED', createdBy: audit.userId }))
    await markSourceAppealed(manager, input.sourceType, input.sourceId)
    await saveEvent(manager, appeal.id, audit, { action: 'APPEAL_SUBMITTED', toStatus: 'SUBMITTED', afterValue: { sourceType: input.sourceType, sourceId: input.sourceId } })
    return appeal
  }).then(async (appeal) => {
    await notify({ eventId: `appeal:${appeal.id}:SUBMITTED`, type: 'APPEAL_SUBMITTED', target: { type: 'ROLE', role: 'FEDERATION_ADMIN' }, category: 'REGULATORY', title: 'Nouvel appel', body: `Un appel a été déposé (${appeal.sourceType}).`, data: { appealId: appeal.id, sourceType: appeal.sourceType, sourceId: appeal.sourceId } })
    return appeal
  })
}

export async function transitionAppeal(dataSource: DataSource, session: SsoUser, audit: AppealAuditContext, id: string, targetStatus: AppealStatus, input: { reason?: string | null; decisionSummary?: string | null } = {}): Promise<Appeal> {
  if (targetStatus === 'DECIDED' && !input.decisionSummary?.trim()) throw new AppealWorkflowError('Le résumé de la décision est obligatoire')
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(Appeal)
    const item = await repo.createQueryBuilder('item').setLock('pessimistic_write').where('item.id = :id', { id }).getOne()
    if (!item) throw new AppealWorkflowError('Appel introuvable')
    assertAccess(session, item)
    assertAppealTransition(item.status, targetStatus)
    const previous = item.status
    item.status = targetStatus
    if (targetStatus === 'DECIDED') { item.decisionAt = new Date(); item.decisionSummary = input.decisionSummary!.trim() }
    await repo.save(item)
    await saveEvent(manager, id, audit, { action: `APPEAL_${targetStatus}`, fromStatus: previous, toStatus: targetStatus, reason: input.reason, afterValue: { status: targetStatus } })
    return item
  })
  if (updated.applicantType === 'CLUB' && ['DECIDED', 'REJECTED'].includes(updated.status)) {
    await notify({ eventId: `appeal:${id}:${updated.status}:${updated.updatedAt.toISOString()}`, type: 'APPEAL_DECIDED', target: { type: 'TEAM', teamId: updated.applicantId }, teamId: updated.applicantId, category: 'REGULATORY', title: 'Décision sur appel', body: `L'appel est maintenant ${updated.status}.`, data: { appealId: id, status: updated.status } })
  }
  return updated
}
