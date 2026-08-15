import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { assertBoardMandateTransition, GovernanceWorkflowError, type BoardMandateStatus } from '../../../packages/regulatory-shared/src/governance'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { BoardMandate, BoardMandateHistory, BoardMember, Team } from './entities'
import { notify } from './notificationClient'

export interface GovernanceAuditContext { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null }
export interface GovernanceFilters { federationId?: string; leagueId?: string; status?: BoardMandateStatus }

export class GovernanceAuthorizationError extends Error { constructor() { super('Forbidden'); this.name = 'GovernanceAuthorizationError' } }

function assertAccess(session: SsoUser, mandate: BoardMandate): void {
  if (canAccessPlatform(session) || canAccessFederation(session, mandate.federationId) || (mandate.leagueId && canAccessLeague(session, mandate.leagueId, mandate.federationId))) return
  throw new GovernanceAuthorizationError()
}

function applyScope(query: SelectQueryBuilder<BoardMandate>, session: SsoUser): void {
  if (canAccessPlatform(session)) return
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) { query.andWhere('mandate.federation_id = :federationId', { federationId: session.federationId }); return }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) { query.andWhere('mandate.league_id = :leagueId', { leagueId: session.leagueId }); return }
  query.andWhere('1 = 0')
}

async function saveHistory(manager: EntityManager, mandateId: string, audit: GovernanceAuditContext, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(BoardMandateHistory)
  await repo.save(repo.create({ mandateId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: audit.userId, actorRole: audit.role, reason: input.reason ?? null, afterValue: input.afterValue ?? null, ipAddress: audit.ipAddress ?? null, userAgent: audit.userAgent ?? null }))
}

export async function listBoardMandates(dataSource: DataSource, session: SsoUser, filters: GovernanceFilters = {}) {
  const query = dataSource.getRepository(BoardMandate).createQueryBuilder('mandate').orderBy('mandate.created_at', 'DESC')
  applyScope(query, session)
  if (filters.federationId) query.andWhere('mandate.federation_id = :filterFederationId', { filterFederationId: filters.federationId })
  if (filters.leagueId) query.andWhere('mandate.league_id = :filterLeagueId', { filterLeagueId: filters.leagueId })
  if (filters.status) query.andWhere('mandate.status = :status', { status: filters.status })
  const rows = await query.getMany()
  const clubIds = [...new Set(rows.map((item) => item.clubId))]
  const clubs = clubIds.length ? await dataSource.getRepository(Team).createQueryBuilder('club').where('club.id IN (:...ids)', { ids: clubIds }).getMany() : []
  const clubNames = new Map(clubs.map((item) => [item.id, item.nom]))
  return rows.map((item) => Object.assign(item, { clubName: clubNames.get(item.clubId) ?? item.clubId }))
}

export async function getBoardMandateBundle(dataSource: DataSource, session: SsoUser, mandateId: string) {
  const mandate = await dataSource.getRepository(BoardMandate).findOne({ where: { id: mandateId } })
  if (!mandate) throw new GovernanceWorkflowError('Mandat introuvable')
  assertAccess(session, mandate)
  const [members, history, rows] = await Promise.all([
    dataSource.getRepository(BoardMember).find({ where: { mandateId }, order: { role: 'ASC' } }),
    dataSource.getRepository(BoardMandateHistory).find({ where: { mandateId }, order: { createdAt: 'DESC' } }),
    listBoardMandates(dataSource, session, {}),
  ])
  return { mandate: rows.find((item) => item.id === mandateId) ?? mandate, members, history }
}

export async function transitionBoardMandate(dataSource: DataSource, session: SsoUser, audit: GovernanceAuditContext, mandateId: string, targetStatus: BoardMandateStatus, reason?: string | null): Promise<BoardMandate> {
  if (targetStatus === 'REJECTED' && !reason?.trim()) throw new GovernanceWorkflowError('Un motif est obligatoire pour rejeter un mandat')
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(BoardMandate)
    const mandate = await repo.createQueryBuilder('mandate').setLock('pessimistic_write').where('mandate.id = :mandateId', { mandateId }).getOne()
    if (!mandate) throw new GovernanceWorkflowError('Mandat introuvable')
    assertAccess(session, mandate)
    assertBoardMandateTransition(mandate.status, targetStatus)
    const previous = mandate.status
    mandate.status = targetStatus
    if (targetStatus === 'VALIDATED') {
      mandate.federationValidatedAt = new Date()
      mandate.validatedBy = audit.userId
      mandate.rejectionReason = null
      await manager.getRepository(BoardMember).createQueryBuilder().update(BoardMember).set({ federationApproved: true }).where('mandate_id = :mandateId', { mandateId }).execute()
    }
    if (targetStatus === 'REJECTED') mandate.rejectionReason = reason!.trim()
    await repo.save(mandate)
    await saveHistory(manager, mandateId, audit, { action: `MANDATE_${targetStatus}`, fromStatus: previous, toStatus: targetStatus, reason, afterValue: { status: targetStatus } })
    return mandate
  })
  await notify({ eventId: `board-mandate:${mandateId}:${updated.status}:${updated.updatedAt.toISOString()}`, type: `BOARD_MANDATE_${updated.status}`, target: { type: 'TEAM', teamId: updated.clubId }, teamId: updated.clubId, category: 'REGULATORY', title: 'Comité directeur', body: `Le mandat du comité directeur est maintenant ${updated.status}.`, data: { mandateId, status: updated.status } })
  return updated
}

export async function approveBoardMember(dataSource: DataSource, session: SsoUser, audit: GovernanceAuditContext, mandateId: string, memberId: string): Promise<BoardMember> {
  return dataSource.transaction(async (manager) => {
    const mandate = await manager.getRepository(BoardMandate).findOne({ where: { id: mandateId } })
    if (!mandate) throw new GovernanceWorkflowError('Mandat introuvable')
    assertAccess(session, mandate)
    const memberRepo = manager.getRepository(BoardMember)
    const member = await memberRepo.findOne({ where: { id: memberId, mandateId } })
    if (!member) throw new GovernanceWorkflowError('Membre introuvable')
    member.federationApproved = true
    await memberRepo.save(member)
    await saveHistory(manager, mandateId, audit, { action: 'MEMBER_APPROVED', afterValue: { memberId, personName: member.personName, role: member.role } })
    return member
  })
}
