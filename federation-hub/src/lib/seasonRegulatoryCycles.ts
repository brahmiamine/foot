import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { assertSeasonRegulatoryCycleTransition, SeasonRegulatoryCycleWorkflowError, type SeasonRegulatoryCycleStatus } from '../../../packages/regulatory-shared/src/seasonRegulatoryCycle'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { ClubLicenseApplication, League, PersonLicense, Saison, SeasonRegulatoryCycle, SeasonRegulatoryCycleHistory } from './entities'
import { notify } from './notificationClient'

export interface SeasonRegulatoryCycleAuditContext { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null }
export interface SeasonRegulatoryCycleFilters { federationId?: string; leagueId?: string; status?: SeasonRegulatoryCycleStatus }
export interface WindowInput { opensAt: string; closesAt?: string | null }

export class SeasonRegulatoryCycleAuthorizationError extends Error { constructor() { super('Forbidden'); this.name = 'SeasonRegulatoryCycleAuthorizationError' } }

function assertAccess(session: SsoUser, cycle: SeasonRegulatoryCycle): void {
  if (canAccessPlatform(session) || canAccessFederation(session, cycle.federationId) || (cycle.leagueId && canAccessLeague(session, cycle.leagueId, cycle.federationId))) return
  throw new SeasonRegulatoryCycleAuthorizationError()
}

function applyScope(query: SelectQueryBuilder<SeasonRegulatoryCycle>, session: SsoUser): void {
  if (canAccessPlatform(session)) return
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) { query.andWhere('cycle.federation_id = :federationId', { federationId: session.federationId }); return }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) { query.andWhere('cycle.league_id = :leagueId', { leagueId: session.leagueId }); return }
  query.andWhere('1 = 0')
}

async function saveHistory(manager: EntityManager, cycleId: string, audit: SeasonRegulatoryCycleAuditContext, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(SeasonRegulatoryCycleHistory)
  await repo.save(repo.create({ cycleId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: audit.userId, actorRole: audit.role, reason: input.reason ?? null, afterValue: input.afterValue ?? null, ipAddress: audit.ipAddress ?? null, userAgent: audit.userAgent ?? null }))
}

export async function listSeasonRegulatoryCycles(dataSource: DataSource, session: SsoUser, filters: SeasonRegulatoryCycleFilters = {}) {
  const query = dataSource.getRepository(SeasonRegulatoryCycle).createQueryBuilder('cycle').orderBy('cycle.created_at', 'DESC')
  applyScope(query, session)
  if (filters.federationId) query.andWhere('cycle.federation_id = :filterFederationId', { filterFederationId: filters.federationId })
  if (filters.leagueId) query.andWhere('cycle.league_id = :filterLeagueId', { filterLeagueId: filters.leagueId })
  if (filters.status) query.andWhere('cycle.status = :status', { status: filters.status })
  const cycles = await query.getMany()
  const seasonIds = [...new Set(cycles.map((item) => item.seasonId))]
  const seasons = seasonIds.length ? await dataSource.getRepository(Saison).createQueryBuilder('season').where('season.id IN (:...ids)', { ids: seasonIds }).getMany() : []
  const seasonMap = new Map(seasons.map((item) => [item.id, item]))
  return cycles.map((cycle) => Object.assign(cycle, { seasonName: seasonMap.get(cycle.seasonId)?.nom ?? cycle.seasonId }))
}

export async function getSeasonRegulatoryCycleBundle(dataSource: DataSource, session: SsoUser, cycleId: string) {
  const cycle = await dataSource.getRepository(SeasonRegulatoryCycle).findOne({ where: { id: cycleId } })
  if (!cycle) throw new SeasonRegulatoryCycleWorkflowError('Cycle réglementaire introuvable')
  assertAccess(session, cycle)
  const history = await dataSource.getRepository(SeasonRegulatoryCycleHistory).find({ where: { cycleId }, order: { createdAt: 'DESC' } })
  const rows = await listSeasonRegulatoryCycles(dataSource, session, {})
  return { cycle: rows.find((item) => item.id === cycleId) ?? cycle, history }
}

export async function createSeasonRegulatoryCycle(dataSource: DataSource, session: SsoUser, audit: SeasonRegulatoryCycleAuditContext, input: { seasonId: string; previousSeasonId?: string | null }): Promise<SeasonRegulatoryCycle> {
  return dataSource.transaction(async (manager) => {
    const season = await manager.getRepository(Saison).findOne({ where: { id: input.seasonId } })
    if (!season) throw new SeasonRegulatoryCycleWorkflowError('Saison introuvable')
    let federationId = session.federationId ?? null
    const leagueId: string | null = season.league_id ?? null
    if (season.league_id) {
      const league = await manager.getRepository(League).findOne({ where: { id: season.league_id } })
      if (league) federationId = league.federation_id
    }
    if (!federationId) throw new SeasonRegulatoryCycleWorkflowError('Impossible de déterminer la fédération compétente pour cette saison')
    if (!canAccessPlatform(session) && !canAccessFederation(session, federationId) && !(leagueId && canAccessLeague(session, leagueId, federationId))) throw new SeasonRegulatoryCycleAuthorizationError()
    const existing = await manager.getRepository(SeasonRegulatoryCycle).findOne({ where: { seasonId: input.seasonId } })
    if (existing) throw new SeasonRegulatoryCycleWorkflowError('Un cycle réglementaire existe déjà pour cette saison')
    const repo = manager.getRepository(SeasonRegulatoryCycle)
    const cycle = await repo.save(repo.create({ seasonId: input.seasonId, federationId, leagueId, status: 'DRAFT', previousSeasonId: input.previousSeasonId ?? null, createdBy: audit.userId }))
    await saveHistory(manager, cycle.id, audit, { action: 'CYCLE_CREATED', toStatus: 'DRAFT', afterValue: { seasonId: input.seasonId } })
    return cycle
  })
}

async function withCycle(dataSource: DataSource, session: SsoUser, cycleId: string, mutate: (manager: EntityManager, cycle: SeasonRegulatoryCycle) => Promise<void>): Promise<SeasonRegulatoryCycle> {
  return dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(SeasonRegulatoryCycle)
    const cycle = await repo.createQueryBuilder('cycle').setLock('pessimistic_write').where('cycle.id = :cycleId', { cycleId }).getOne()
    if (!cycle) throw new SeasonRegulatoryCycleWorkflowError('Cycle réglementaire introuvable')
    assertAccess(session, cycle)
    await mutate(manager, cycle)
    return repo.save(cycle)
  })
}

export async function activateSeasonRegulatoryCycle(dataSource: DataSource, session: SsoUser, audit: SeasonRegulatoryCycleAuditContext, cycleId: string): Promise<SeasonRegulatoryCycle> {
  return withCycle(dataSource, session, cycleId, async (manager, cycle) => {
    assertSeasonRegulatoryCycleTransition(cycle.status, 'ACTIVE')
    const previous = cycle.status
    cycle.status = 'ACTIVE'
    await saveHistory(manager, cycleId, audit, { action: 'CYCLE_ACTIVATED', fromStatus: previous, toStatus: 'ACTIVE' })
  })
}

export async function setClubLicensingWindow(dataSource: DataSource, session: SsoUser, audit: SeasonRegulatoryCycleAuditContext, cycleId: string, input: WindowInput): Promise<SeasonRegulatoryCycle> {
  const updated = await withCycle(dataSource, session, cycleId, async (manager, cycle) => {
    if (cycle.status === 'CLOSED') throw new SeasonRegulatoryCycleWorkflowError('Ce cycle est clos')
    cycle.clubLicensingOpenAt = new Date(input.opensAt)
    cycle.clubLicensingCloseAt = input.closesAt ? new Date(input.closesAt) : null
    await saveHistory(manager, cycleId, audit, { action: 'CLUB_LICENSING_WINDOW_SET', afterValue: { opensAt: input.opensAt, closesAt: input.closesAt ?? null } })
  })
  await notify({ eventId: `season-cycle:${cycleId}:CLUB_LICENSING_OPENED:${updated.clubLicensingOpenAt?.toISOString()}`, type: 'CLUB_LICENSING_WINDOW_OPENED', target: { type: 'ROLE', role: 'CLUB_ADMIN' }, category: 'REGULATORY', title: 'Ouverture des licences club', body: 'La campagne de licence club est ouverte pour la nouvelle saison.', data: { cycleId, seasonId: updated.seasonId } })
  return updated
}

export async function setRegistrationWindow(dataSource: DataSource, session: SsoUser, audit: SeasonRegulatoryCycleAuditContext, cycleId: string, input: WindowInput): Promise<SeasonRegulatoryCycle> {
  const updated = await withCycle(dataSource, session, cycleId, async (manager, cycle) => {
    if (cycle.status === 'CLOSED') throw new SeasonRegulatoryCycleWorkflowError('Ce cycle est clos')
    cycle.registrationOpenAt = new Date(input.opensAt)
    cycle.registrationCloseAt = input.closesAt ? new Date(input.closesAt) : null
    await saveHistory(manager, cycleId, audit, { action: 'REGISTRATION_WINDOW_SET', afterValue: { opensAt: input.opensAt, closesAt: input.closesAt ?? null } })
  })
  await notify({ eventId: `season-cycle:${cycleId}:REGISTRATION_OPENED:${updated.registrationOpenAt?.toISOString()}`, type: 'REGISTRATION_WINDOW_OPENED', target: { type: 'ROLE', role: 'CLUB_ADMIN' }, category: 'REGULATORY', title: 'Ouverture des inscriptions', body: 'La campagne d’inscription des joueurs est ouverte pour la nouvelle saison.', data: { cycleId, seasonId: updated.seasonId } })
  return updated
}

/** Expire les licences club/personnes APPROVED de la saison précédente encore actives. Idempotent (relance sans effet une fois expiré). */
async function expirePreviousSeasonLicenses(manager: EntityManager, previousSeasonId: string): Promise<{ clubLicenses: number; personLicenses: number }> {
  const clubResult = await manager.getRepository(ClubLicenseApplication).createQueryBuilder().update(ClubLicenseApplication).set({ status: 'EXPIRED' }).where('season_id = :seasonId', { seasonId: previousSeasonId }).andWhere('status = :status', { status: 'APPROVED' }).execute()
  const personResult = await manager.getRepository(PersonLicense).createQueryBuilder().update(PersonLicense).set({ status: 'EXPIRED' }).where('season_id = :seasonId', { seasonId: previousSeasonId }).andWhere('status = :status', { status: 'APPROVED' }).execute()
  return { clubLicenses: clubResult.affected ?? 0, personLicenses: personResult.affected ?? 0 }
}

export async function closeSeasonRegulatoryCycle(dataSource: DataSource, session: SsoUser, audit: SeasonRegulatoryCycleAuditContext, cycleId: string): Promise<SeasonRegulatoryCycle> {
  return dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(SeasonRegulatoryCycle)
    const cycle = await repo.createQueryBuilder('cycle').setLock('pessimistic_write').where('cycle.id = :cycleId', { cycleId }).getOne()
    if (!cycle) throw new SeasonRegulatoryCycleWorkflowError('Cycle réglementaire introuvable')
    assertAccess(session, cycle)
    assertSeasonRegulatoryCycleTransition(cycle.status, 'CLOSED')
    const previous = cycle.status
    cycle.status = 'CLOSED'
    let expired = { clubLicenses: 0, personLicenses: 0 }
    if (cycle.previousSeasonId && !cycle.previousSeasonExpiredAt) {
      expired = await expirePreviousSeasonLicenses(manager, cycle.previousSeasonId)
      cycle.previousSeasonExpiredAt = new Date()
    }
    await repo.save(cycle)
    await saveHistory(manager, cycleId, audit, { action: 'CYCLE_CLOSED', fromStatus: previous, toStatus: 'CLOSED', afterValue: { expiredClubLicenses: expired.clubLicenses, expiredPersonLicenses: expired.personLicenses } })
    return cycle
  })
}
