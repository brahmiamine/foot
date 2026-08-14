import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { assertCoachQualificationTransition, CoachQualificationWorkflowError, type CoachQualificationStatus } from '../../../packages/regulatory-shared/src/coachQualification'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { CoachQualification, CoachQualificationHistory, Team } from './entities'
import { notify } from './notificationClient'

export interface CoachQualificationAuditContext { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null }
export interface CoachQualificationFilters { federationId?: string; leagueId?: string; clubId?: string; status?: CoachQualificationStatus }

export class CoachQualificationAuthorizationError extends Error { constructor() { super('Forbidden'); this.name = 'CoachQualificationAuthorizationError' } }

function assertAccess(session: SsoUser, item: CoachQualification): void {
  if (canAccessPlatform(session) || canAccessFederation(session, item.federationId) || (item.leagueId && canAccessLeague(session, item.leagueId, item.federationId))) return
  throw new CoachQualificationAuthorizationError()
}

function applyScope(query: SelectQueryBuilder<CoachQualification>, session: SsoUser): void {
  if (canAccessPlatform(session)) return
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) { query.andWhere('item.federation_id = :federationId', { federationId: session.federationId }); return }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) { query.andWhere('item.league_id = :leagueId', { leagueId: session.leagueId }); return }
  query.andWhere('1 = 0')
}

async function saveHistory(manager: EntityManager, qualificationId: string, audit: CoachQualificationAuditContext, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(CoachQualificationHistory)
  await repo.save(repo.create({ qualificationId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: audit.userId, actorRole: audit.role, reason: input.reason ?? null, afterValue: input.afterValue ?? null, ipAddress: audit.ipAddress ?? null, userAgent: audit.userAgent ?? null }))
}

export async function listCoachQualifications(dataSource: DataSource, session: SsoUser, filters: CoachQualificationFilters = {}) {
  const query = dataSource.getRepository(CoachQualification).createQueryBuilder('item').orderBy('item.created_at', 'DESC')
  applyScope(query, session)
  if (filters.federationId) query.andWhere('item.federation_id = :filterFederationId', { filterFederationId: filters.federationId })
  if (filters.leagueId) query.andWhere('item.league_id = :filterLeagueId', { filterLeagueId: filters.leagueId })
  if (filters.clubId) query.andWhere('item.club_id = :clubId', { clubId: filters.clubId })
  if (filters.status) query.andWhere('item.status = :status', { status: filters.status })
  const rows = await query.getMany()
  const clubIds = [...new Set(rows.map((item) => item.clubId))]
  const staffIds = [...new Set(rows.map((item) => String(item.staffId)))]
  const [clubs, staffRows] = await Promise.all([
    clubIds.length ? dataSource.getRepository(Team).createQueryBuilder('club').where('club.id IN (:...ids)', { ids: clubIds }).getMany() : [],
    staffIds.length ? dataSource.query(`SELECT id, first_name_fr AS firstName, last_name_fr AS lastName FROM cms_staff WHERE id IN (${staffIds.map(() => '?').join(',')})`, staffIds) as Promise<Array<{ id: string; firstName: string; lastName: string }>> : [],
  ])
  const clubNames = new Map(clubs.map((item) => [item.id, item.nom]))
  const staffNames = new Map(staffRows.map((item) => [String(item.id), `${item.firstName} ${item.lastName}`]))
  return rows.map((item) => Object.assign(item, { clubName: clubNames.get(item.clubId) ?? item.clubId, staffName: staffNames.get(String(item.staffId)) ?? String(item.staffId) }))
}

export async function getCoachQualificationBundle(dataSource: DataSource, session: SsoUser, id: string) {
  const item = await dataSource.getRepository(CoachQualification).findOne({ where: { id } })
  if (!item) throw new CoachQualificationWorkflowError('Qualification introuvable')
  assertAccess(session, item)
  const [history, rows] = await Promise.all([
    dataSource.getRepository(CoachQualificationHistory).find({ where: { qualificationId: id }, order: { createdAt: 'DESC' } }),
    listCoachQualifications(dataSource, session, {}),
  ])
  return { qualification: rows.find((row) => row.id === id) ?? item, history }
}

export async function decideCoachQualification(dataSource: DataSource, session: SsoUser, audit: CoachQualificationAuditContext, id: string, targetStatus: CoachQualificationStatus, input: { reason?: string | null; expiresAt?: string | null; licenseNumber?: string | null } = {}): Promise<CoachQualification> {
  if (targetStatus === 'REVOKED' && !input.reason?.trim()) throw new CoachQualificationWorkflowError('Un motif est obligatoire pour révoquer une qualification')
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(CoachQualification)
    const item = await repo.createQueryBuilder('item').setLock('pessimistic_write').where('item.id = :id', { id }).getOne()
    if (!item) throw new CoachQualificationWorkflowError('Qualification introuvable')
    assertAccess(session, item)
    assertCoachQualificationTransition(item.status, targetStatus)
    const previous = item.status
    item.status = targetStatus
    if (targetStatus === 'VALID') {
      item.validatedBy = audit.userId
      item.validatedAt = new Date()
      item.rejectionReason = null
      if (input.expiresAt) item.expiresAt = input.expiresAt
      if (input.licenseNumber) item.licenseNumber = input.licenseNumber
      if (!item.issuedAt) item.issuedAt = new Date().toISOString().slice(0, 10)
    }
    if (targetStatus === 'REVOKED') item.rejectionReason = input.reason!.trim()
    await repo.save(item)
    await saveHistory(manager, id, audit, { action: `QUALIFICATION_${targetStatus}`, fromStatus: previous, toStatus: targetStatus, reason: input.reason, afterValue: { status: targetStatus } })
    return item
  })
  await notify({ eventId: `coach-qualification:${id}:${updated.status}:${updated.updatedAt.toISOString()}`, type: 'COACH_QUALIFICATION_DECIDED', target: { type: 'TEAM', teamId: updated.clubId }, teamId: updated.clubId, category: 'REGULATORY', title: 'Qualification entraîneur', body: `La qualification technique est maintenant ${updated.status}.`, data: { qualificationId: id, status: updated.status } })
  return updated
}
