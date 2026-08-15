import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { assertFinancialComplianceTransition, FinancialComplianceWorkflowError, type FinancialComplianceStatus } from '../../../packages/regulatory-shared/src/financialCompliance'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { FinancialCompliance, FinancialComplianceHistory, Team } from './entities'
import { notify } from './notificationClient'

export interface FinancialComplianceAuditContext { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null }
export interface FinancialComplianceFilters { federationId?: string; leagueId?: string; seasonId?: string; status?: FinancialComplianceStatus }

export class FinancialComplianceAuthorizationError extends Error { constructor() { super('Forbidden'); this.name = 'FinancialComplianceAuthorizationError' } }

function assertAccess(session: SsoUser, item: FinancialCompliance): void {
  if (canAccessPlatform(session) || canAccessFederation(session, item.federationId) || (item.leagueId && canAccessLeague(session, item.leagueId, item.federationId))) return
  throw new FinancialComplianceAuthorizationError()
}

function applyScope(query: SelectQueryBuilder<FinancialCompliance>, session: SsoUser): void {
  if (canAccessPlatform(session)) return
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) { query.andWhere('item.federation_id = :federationId', { federationId: session.federationId }); return }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) { query.andWhere('item.league_id = :leagueId', { leagueId: session.leagueId }); return }
  query.andWhere('1 = 0')
}

async function saveHistory(manager: EntityManager, complianceId: string, audit: FinancialComplianceAuditContext, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(FinancialComplianceHistory)
  await repo.save(repo.create({ complianceId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: audit.userId, actorRole: audit.role, reason: input.reason ?? null, afterValue: input.afterValue ?? null, ipAddress: audit.ipAddress ?? null, userAgent: audit.userAgent ?? null }))
}

export async function listFinancialCompliance(dataSource: DataSource, session: SsoUser, filters: FinancialComplianceFilters = {}) {
  const query = dataSource.getRepository(FinancialCompliance).createQueryBuilder('item').orderBy('item.updated_at', 'DESC')
  applyScope(query, session)
  if (filters.federationId) query.andWhere('item.federation_id = :filterFederationId', { filterFederationId: filters.federationId })
  if (filters.leagueId) query.andWhere('item.league_id = :filterLeagueId', { filterLeagueId: filters.leagueId })
  if (filters.seasonId) query.andWhere('item.season_id = :seasonId', { seasonId: filters.seasonId })
  if (filters.status) query.andWhere('item.status = :status', { status: filters.status })
  const rows = await query.getMany()
  const clubIds = [...new Set(rows.map((item) => item.clubId))]
  const clubs = clubIds.length ? await dataSource.getRepository(Team).createQueryBuilder('club').where('club.id IN (:...ids)', { ids: clubIds }).getMany() : []
  const clubNames = new Map(clubs.map((item) => [item.id, item.nom]))
  return rows.map((item) => Object.assign(item, { clubName: clubNames.get(item.clubId) ?? item.clubId, totalDebts: [item.playerDebts, item.staffDebts, item.taxDebts, item.federationDebts, item.otherDebts].reduce((sum, value) => sum + Number(value ?? 0), 0) }))
}

export async function getFinancialComplianceBundle(dataSource: DataSource, session: SsoUser, id: string) {
  const item = await dataSource.getRepository(FinancialCompliance).findOne({ where: { id } })
  if (!item) throw new FinancialComplianceWorkflowError('Dossier financier introuvable')
  assertAccess(session, item)
  const [history, rows] = await Promise.all([
    dataSource.getRepository(FinancialComplianceHistory).find({ where: { complianceId: id }, order: { createdAt: 'DESC' } }),
    listFinancialCompliance(dataSource, session, { seasonId: item.seasonId }),
  ])
  return { compliance: rows.find((row) => row.id === id) ?? item, history }
}

export async function transitionFinancialCompliance(dataSource: DataSource, session: SsoUser, audit: FinancialComplianceAuditContext, id: string, targetStatus: FinancialComplianceStatus, reviewComment?: string | null): Promise<FinancialCompliance> {
  if ((targetStatus === 'NON_COMPLIANT' || targetStatus === 'CONDITIONAL') && !reviewComment?.trim()) throw new FinancialComplianceWorkflowError('Un commentaire est obligatoire pour cette décision')
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(FinancialCompliance)
    const item = await repo.createQueryBuilder('item').setLock('pessimistic_write').where('item.id = :id', { id }).getOne()
    if (!item) throw new FinancialComplianceWorkflowError('Dossier financier introuvable')
    assertAccess(session, item)
    assertFinancialComplianceTransition(item.status, targetStatus)
    const previous = item.status
    item.status = targetStatus
    if (targetStatus === 'UNDER_REVIEW') { item.reviewedAt = null; item.reviewedBy = null }
    if (['COMPLIANT', 'CONDITIONAL', 'NON_COMPLIANT'].includes(targetStatus)) { item.reviewedAt = new Date(); item.reviewedBy = audit.userId; item.reviewComment = reviewComment?.trim() ?? null }
    await repo.save(item)
    await saveHistory(manager, id, audit, { action: `STATUS_${targetStatus}`, fromStatus: previous, toStatus: targetStatus, reason: reviewComment, afterValue: { status: targetStatus } })
    return item
  })
  await notify({ eventId: `financial-compliance:${id}:${updated.status}:${updated.updatedAt.toISOString()}`, type: 'FINANCIAL_COMPLIANCE_DECIDED', target: { type: 'TEAM', teamId: updated.clubId }, teamId: updated.clubId, category: 'REGULATORY', title: 'Contrôle financier fédéral', body: `Le dossier financier est maintenant ${updated.status}.`, data: { complianceId: id, status: updated.status } })
  return updated
}
