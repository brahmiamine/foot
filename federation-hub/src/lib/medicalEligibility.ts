import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { assertMedicalEligibilityTransition, MedicalEligibilityWorkflowError, type MedicalEligibilityStatus } from '../../../packages/regulatory-shared/src/medicalEligibility'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { MedicalEligibility, MedicalEligibilityHistory, Player, Team } from './entities'
import { notify } from './notificationClient'

export interface MedicalEligibilityAuditContext { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null }
export interface MedicalEligibilityFilters { federationId?: string; leagueId?: string; clubId?: string; seasonId?: string; status?: MedicalEligibilityStatus }

export class MedicalEligibilityAuthorizationError extends Error { constructor() { super('Forbidden'); this.name = 'MedicalEligibilityAuthorizationError' } }

function assertAccess(session: SsoUser, item: MedicalEligibility): void {
  if (canAccessPlatform(session) || canAccessFederation(session, item.federationId) || (item.leagueId && canAccessLeague(session, item.leagueId, item.federationId))) return
  throw new MedicalEligibilityAuthorizationError()
}

function applyScope(query: SelectQueryBuilder<MedicalEligibility>, session: SsoUser): void {
  if (canAccessPlatform(session)) return
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) { query.andWhere('item.federation_id = :federationId', { federationId: session.federationId }); return }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) { query.andWhere('item.league_id = :leagueId', { leagueId: session.leagueId }); return }
  query.andWhere('1 = 0')
}

async function saveHistory(manager: EntityManager, eligibilityId: string, audit: MedicalEligibilityAuditContext, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(MedicalEligibilityHistory)
  await repo.save(repo.create({ eligibilityId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: audit.userId, actorRole: audit.role, reason: input.reason ?? null, afterValue: input.afterValue ?? null, ipAddress: audit.ipAddress ?? null, userAgent: audit.userAgent ?? null }))
}

export async function listMedicalEligibilities(dataSource: DataSource, session: SsoUser, filters: MedicalEligibilityFilters = {}) {
  const query = dataSource.getRepository(MedicalEligibility).createQueryBuilder('item').orderBy('item.created_at', 'DESC')
  applyScope(query, session)
  if (filters.federationId) query.andWhere('item.federation_id = :filterFederationId', { filterFederationId: filters.federationId })
  if (filters.leagueId) query.andWhere('item.league_id = :filterLeagueId', { filterLeagueId: filters.leagueId })
  if (filters.clubId) query.andWhere('item.club_id = :clubId', { clubId: filters.clubId })
  if (filters.seasonId) query.andWhere('item.season_id = :seasonId', { seasonId: filters.seasonId })
  if (filters.status) query.andWhere('item.status = :status', { status: filters.status })
  const rows = await query.getMany()
  const clubIds = [...new Set(rows.map((item) => item.clubId))]
  const playerIds = [...new Set(rows.map((item) => item.playerId))]
  const [clubs, players] = await Promise.all([
    clubIds.length ? dataSource.getRepository(Team).createQueryBuilder('club').where('club.id IN (:...ids)', { ids: clubIds }).getMany() : [],
    playerIds.length ? dataSource.getRepository(Player).createQueryBuilder('player').where('player.id IN (:...ids)', { ids: playerIds }).getMany() : [],
  ])
  const clubNames = new Map(clubs.map((item) => [item.id, item.nom]))
  const playerNames = new Map(players.map((item) => [item.id, `${item.firstNameFr} ${item.lastNameFr}`]))
  return rows.map((item) => Object.assign(item, { clubName: clubNames.get(item.clubId) ?? item.clubId, playerName: playerNames.get(item.playerId) ?? item.playerId }))
}

export async function getMedicalEligibilityBundle(dataSource: DataSource, session: SsoUser, id: string) {
  const item = await dataSource.getRepository(MedicalEligibility).findOne({ where: { id } })
  if (!item) throw new MedicalEligibilityWorkflowError('Dossier médical introuvable')
  assertAccess(session, item)
  const [history, rows] = await Promise.all([
    dataSource.getRepository(MedicalEligibilityHistory).find({ where: { eligibilityId: id }, order: { createdAt: 'DESC' } }),
    listMedicalEligibilities(dataSource, session, {}),
  ])
  return { eligibility: rows.find((row) => row.id === id) ?? item, history }
}

export async function decideMedicalEligibility(dataSource: DataSource, session: SsoUser, audit: MedicalEligibilityAuditContext, id: string, targetStatus: MedicalEligibilityStatus, input: { reason?: string | null; expiresAt?: string | null } = {}): Promise<MedicalEligibility> {
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(MedicalEligibility)
    const item = await repo.createQueryBuilder('item').setLock('pessimistic_write').where('item.id = :id', { id }).getOne()
    if (!item) throw new MedicalEligibilityWorkflowError('Dossier médical introuvable')
    assertAccess(session, item)
    assertMedicalEligibilityTransition(item.status, targetStatus)
    const previous = item.status
    item.status = targetStatus
    if (targetStatus === 'FIT') {
      item.validatedByMedicalUserId = audit.userId
      item.validatedAt = new Date()
      item.expiresAt = input.expiresAt ?? item.expiresAt ?? null
    }
    if (targetStatus === 'UNFIT') {
      item.validatedByMedicalUserId = audit.userId
      item.validatedAt = new Date()
    }
    await repo.save(item)
    await saveHistory(manager, id, audit, { action: `ELIGIBILITY_${targetStatus}`, fromStatus: previous, toStatus: targetStatus, reason: input.reason, afterValue: { status: targetStatus } })
    return item
  })
  await notify({ eventId: `medical-eligibility:${id}:${updated.status}:${updated.updatedAt.toISOString()}`, type: 'MEDICAL_ELIGIBILITY_DECIDED', target: { type: 'TEAM', teamId: updated.clubId }, teamId: updated.clubId, category: 'REGULATORY', title: 'Aptitude médicale fédérale', body: `L'aptitude médicale du joueur est maintenant ${updated.status}.`, data: { eligibilityId: id, status: updated.status } })
  return updated
}
