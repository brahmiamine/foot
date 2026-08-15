import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { assertStadiumInspectionTransition, StadiumLicensingWorkflowError, type StadiumAspectStatus, type StadiumInspectionStatus } from '../../../packages/regulatory-shared/src/stadiumLicensing'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { StadiumInspection, StadiumInspectionHistory, StadiumRestriction, Team, TeamAffiliation } from './entities'
import { notify } from './notificationClient'

export interface StadiumInspectionAuditContext { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null }
export interface StadiumInspectionFilters { federationId?: string; leagueId?: string; seasonId?: string; clubId?: string; status?: StadiumInspectionStatus }
export interface StadiumInspectionInput {
  stadiumId: string; clubId: string; seasonId: string; inspectionDate: string
  pitchStatus?: StadiumAspectStatus; lightingStatus?: StadiumAspectStatus; changingRoomsStatus?: StadiumAspectStatus
  securityStatus?: StadiumAspectStatus; capacityStatus?: StadiumAspectStatus; medicalStatus?: StadiumAspectStatus
  mediaStatus?: StadiumAspectStatus; varStatus?: StadiumAspectStatus | null; observations?: string | null
}

export class StadiumInspectionAuthorizationError extends Error { constructor() { super('Forbidden'); this.name = 'StadiumInspectionAuthorizationError' } }

function assertAccess(session: SsoUser, item: StadiumInspection): void {
  if (canAccessPlatform(session) || canAccessFederation(session, item.federationId) || (item.leagueId && canAccessLeague(session, item.leagueId, item.federationId))) return
  throw new StadiumInspectionAuthorizationError()
}

function applyScope(query: SelectQueryBuilder<StadiumInspection>, session: SsoUser): void {
  if (canAccessPlatform(session)) return
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) { query.andWhere('item.federation_id = :federationId', { federationId: session.federationId }); return }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) { query.andWhere('item.league_id = :leagueId', { leagueId: session.leagueId }); return }
  query.andWhere('1 = 0')
}

async function saveHistory(manager: EntityManager, inspectionId: string, audit: StadiumInspectionAuditContext, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(StadiumInspectionHistory)
  await repo.save(repo.create({ inspectionId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: audit.userId, actorRole: audit.role, reason: input.reason ?? null, afterValue: input.afterValue ?? null, ipAddress: audit.ipAddress ?? null, userAgent: audit.userAgent ?? null }))
}

export async function listStadiumInspections(dataSource: DataSource, session: SsoUser, filters: StadiumInspectionFilters = {}) {
  const query = dataSource.getRepository(StadiumInspection).createQueryBuilder('item').orderBy('item.inspection_date', 'DESC')
  applyScope(query, session)
  if (filters.federationId) query.andWhere('item.federation_id = :filterFederationId', { filterFederationId: filters.federationId })
  if (filters.leagueId) query.andWhere('item.league_id = :filterLeagueId', { filterLeagueId: filters.leagueId })
  if (filters.seasonId) query.andWhere('item.season_id = :seasonId', { seasonId: filters.seasonId })
  if (filters.clubId) query.andWhere('item.club_id = :clubId', { clubId: filters.clubId })
  if (filters.status) query.andWhere('item.status = :status', { status: filters.status })
  const rows = await query.getMany()
  const clubIds = [...new Set(rows.map((item) => item.clubId))]
  const stadiumIds = [...new Set(rows.map((item) => item.stadiumId))]
  const [clubs, stadiums] = await Promise.all([
    clubIds.length ? dataSource.getRepository(Team).createQueryBuilder('club').where('club.id IN (:...ids)', { ids: clubIds }).getMany() : [],
    stadiumIds.length ? dataSource.query(`SELECT id, name_fr AS nameFr FROM cms_stadiums WHERE id IN (${stadiumIds.map(() => '?').join(',')})`, stadiumIds) as Promise<Array<{ id: number; nameFr: string }>> : [],
  ])
  const clubNames = new Map(clubs.map((item) => [item.id, item.nom]))
  const stadiumNames = new Map(stadiums.map((item) => [String(item.id), item.nameFr]))
  return rows.map((item) => Object.assign(item, { clubName: clubNames.get(item.clubId) ?? item.clubId, stadiumName: stadiumNames.get(String(item.stadiumId)) ?? item.stadiumId }))
}

export async function getStadiumInspectionBundle(dataSource: DataSource, session: SsoUser, id: string) {
  const item = await dataSource.getRepository(StadiumInspection).findOne({ where: { id } })
  if (!item) throw new StadiumLicensingWorkflowError('Inspection introuvable')
  assertAccess(session, item)
  const [restrictions, history, rows] = await Promise.all([
    dataSource.getRepository(StadiumRestriction).find({ where: { inspectionId: id }, order: { createdAt: 'DESC' } }),
    dataSource.getRepository(StadiumInspectionHistory).find({ where: { inspectionId: id }, order: { createdAt: 'DESC' } }),
    listStadiumInspections(dataSource, session, {}),
  ])
  return { inspection: rows.find((row) => row.id === id) ?? item, restrictions, history }
}

export async function createStadiumInspection(dataSource: DataSource, session: SsoUser, audit: StadiumInspectionAuditContext, input: StadiumInspectionInput): Promise<StadiumInspection> {
  return dataSource.transaction(async (manager) => {
    const affiliation = await manager.getRepository(TeamAffiliation).findOne({ where: { teamId: input.clubId, status: 'ACTIVE' } })
    if (!affiliation) throw new StadiumLicensingWorkflowError('Aucune affiliation réglementaire active pour ce club')
    if (!canAccessPlatform(session) && !canAccessFederation(session, affiliation.federationId) && !(affiliation.leagueId && canAccessLeague(session, affiliation.leagueId, affiliation.federationId))) throw new StadiumInspectionAuthorizationError()
    const stadiumRows = await manager.query('SELECT id FROM cms_stadiums WHERE id = ? AND team_id = ? LIMIT 1', [input.stadiumId, input.clubId]) as Array<{ id: number }>
    if (!stadiumRows[0]) throw new StadiumLicensingWorkflowError("Ce stade n'appartient pas à ce club")
    const repo = manager.getRepository(StadiumInspection)
    const inspection = await repo.save(repo.create({
      stadiumId: input.stadiumId, clubId: input.clubId, seasonId: input.seasonId, federationId: affiliation.federationId, leagueId: affiliation.leagueId ?? null,
      inspectionDate: input.inspectionDate, inspectorUserId: audit.userId,
      pitchStatus: input.pitchStatus ?? 'OK', lightingStatus: input.lightingStatus ?? 'OK', changingRoomsStatus: input.changingRoomsStatus ?? 'OK',
      securityStatus: input.securityStatus ?? 'OK', capacityStatus: input.capacityStatus ?? 'OK', medicalStatus: input.medicalStatus ?? 'OK',
      mediaStatus: input.mediaStatus ?? 'OK', varStatus: input.varStatus ?? null, observations: input.observations ?? null, status: 'PENDING',
    }))
    await saveHistory(manager, inspection.id, audit, { action: 'INSPECTION_CREATED', toStatus: 'PENDING' })
    return inspection
  })
}

export async function decideStadiumInspection(dataSource: DataSource, session: SsoUser, audit: StadiumInspectionAuditContext, id: string, targetStatus: StadiumInspectionStatus, input: { reason?: string | null; expiresAt?: string | null; restrictions?: string[] }): Promise<StadiumInspection> {
  if (targetStatus === 'REJECTED' && !input.reason?.trim()) throw new StadiumLicensingWorkflowError('Un motif est obligatoire pour rejeter une inspection')
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(StadiumInspection)
    const item = await repo.createQueryBuilder('item').setLock('pessimistic_write').where('item.id = :id', { id }).getOne()
    if (!item) throw new StadiumLicensingWorkflowError('Inspection introuvable')
    assertAccess(session, item)
    assertStadiumInspectionTransition(item.status, targetStatus)
    const previous = item.status
    item.status = targetStatus
    item.expiresAt = input.expiresAt ?? item.expiresAt ?? null
    await repo.save(item)
    if (targetStatus === 'APPROVED_WITH_RESTRICTIONS' && input.restrictions?.length) {
      const restrictionRepo = manager.getRepository(StadiumRestriction)
      for (const description of input.restrictions) await restrictionRepo.save(restrictionRepo.create({ inspectionId: id, description }))
    }
    await saveHistory(manager, id, audit, { action: `INSPECTION_${targetStatus}`, fromStatus: previous, toStatus: targetStatus, reason: input.reason, afterValue: { status: targetStatus, expiresAt: item.expiresAt } })
    return item
  })
  await notify({ eventId: `stadium-inspection:${id}:${updated.status}:${updated.updatedAt.toISOString()}`, type: 'STADIUM_INSPECTION_DECIDED', target: { type: 'TEAM', teamId: updated.clubId }, teamId: updated.clubId, category: 'REGULATORY', title: 'Homologation du stade', body: `L'inspection du stade est maintenant ${updated.status}.`, data: { inspectionId: id, status: updated.status } })
  return updated
}
