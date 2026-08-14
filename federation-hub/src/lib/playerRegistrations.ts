import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { isPersonLicenseActive } from '../../../packages/regulatory-shared/src/personLicensing'
import { assertPlayerRegistrationTransition, eligibilityForRegistrationStatus, PlayerRegistrationWorkflowError, type PlayerRegistrationStatus } from '../../../packages/regulatory-shared/src/playerRegistration'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { PersonLicense, Player, PlayerRegistration, PlayerRegistrationHistory, Saison, Team } from './entities'
import { notify } from './notificationClient'

export interface PlayerRegistrationAuditContext { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null }
export interface PlayerRegistrationFilters { seasonId?: string; federationId?: string; leagueId?: string; clubId?: string; status?: PlayerRegistrationStatus; eligibilityStatus?: string }

export class PlayerRegistrationAuthorizationError extends Error {
  constructor() { super('Forbidden'); this.name = 'PlayerRegistrationAuthorizationError' }
}

function assertAccess(session: SsoUser, registration: PlayerRegistration): void {
  if (canAccessPlatform(session) || canAccessFederation(session, registration.federationId) || (registration.leagueId && canAccessLeague(session, registration.leagueId, registration.federationId))) return
  throw new PlayerRegistrationAuthorizationError()
}

function applyScope(query: SelectQueryBuilder<PlayerRegistration>, session: SsoUser): void {
  if (canAccessPlatform(session)) return
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) { query.andWhere('registration.federation_id = :federationId', { federationId: session.federationId }); return }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) { query.andWhere('registration.league_id = :leagueId', { leagueId: session.leagueId }); return }
  query.andWhere('1 = 0')
}

export async function listPlayerRegistrations(dataSource: DataSource, session: SsoUser, filters: PlayerRegistrationFilters = {}) {
  const query = dataSource.getRepository(PlayerRegistration).createQueryBuilder('registration').orderBy('registration.updated_at', 'DESC')
  applyScope(query, session)
  if (filters.seasonId) query.andWhere('registration.season_id = :seasonId', { seasonId: filters.seasonId })
  if (filters.federationId) query.andWhere('registration.federation_id = :filterFederationId', { filterFederationId: filters.federationId })
  if (filters.leagueId) query.andWhere('registration.league_id = :filterLeagueId', { filterLeagueId: filters.leagueId })
  if (filters.clubId) query.andWhere('registration.club_id = :clubId', { clubId: filters.clubId })
  if (filters.status) query.andWhere('registration.status = :status', { status: filters.status })
  if (filters.eligibilityStatus) query.andWhere('registration.eligibility_status = :eligibilityStatus', { eligibilityStatus: filters.eligibilityStatus })
  const registrations = await query.getMany()
  const playerIds = [...new Set(registrations.map((item) => item.playerId))]
  const clubIds = [...new Set(registrations.map((item) => item.clubId))]
  const seasonIds = [...new Set(registrations.map((item) => item.seasonId))]
  const [players, clubs, seasons] = await Promise.all([
    playerIds.length ? dataSource.getRepository(Player).createQueryBuilder('player').where('player.id IN (:...ids)', { ids: playerIds }).getMany() : [],
    clubIds.length ? dataSource.getRepository(Team).createQueryBuilder('club').where('club.id IN (:...ids)', { ids: clubIds }).getMany() : [],
    seasonIds.length ? dataSource.getRepository(Saison).createQueryBuilder('season').where('season.id IN (:...ids)', { ids: seasonIds }).getMany() : [],
  ])
  const playerNames = new Map(players.map((player) => [player.id, `${player.firstNameFr} ${player.lastNameFr}`]))
  const clubNames = new Map(clubs.map((club) => [club.id, club.nom]))
  const seasonNames = new Map(seasons.map((season) => [season.id, `${season.nom} · ${season.type_competition}`]))
  return registrations.map((registration) => Object.assign(registration, { playerName: playerNames.get(registration.playerId) ?? registration.playerId, clubName: clubNames.get(registration.clubId) ?? registration.clubId, seasonName: seasonNames.get(registration.seasonId) ?? registration.seasonId }))
}

export async function getPlayerRegistrationBundle(dataSource: DataSource, session: SsoUser, registrationId: string) {
  const registration = await dataSource.getRepository(PlayerRegistration).findOne({ where: { id: registrationId } })
  if (!registration) throw new PlayerRegistrationWorkflowError('Enregistrement joueur introuvable')
  assertAccess(session, registration)
  const [history, rows] = await Promise.all([
    dataSource.getRepository(PlayerRegistrationHistory).find({ where: { registrationId }, order: { createdAt: 'DESC' } }),
    listPlayerRegistrations(dataSource, session, { clubId: registration.clubId, seasonId: registration.seasonId }),
  ])
  const enriched = rows.find((item) => item.id === registrationId) ?? registration
  return { registration: enriched, history }
}

async function saveHistory(manager: EntityManager, registrationId: string, audit: PlayerRegistrationAuditContext, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; beforeValue?: Record<string, unknown> | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(PlayerRegistrationHistory)
  await repo.save(repo.create({ registrationId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: audit.userId, actorRole: audit.role, reason: input.reason ?? null, beforeValue: input.beforeValue ?? null, afterValue: input.afterValue ?? null, ipAddress: audit.ipAddress ?? null, userAgent: audit.userAgent ?? null }))
}

const EVENTS: Partial<Record<PlayerRegistrationStatus, string>> = { APPROVED: 'PLAYER_REGISTRATION_APPROVED', REJECTED: 'PLAYER_REGISTRATION_REJECTED', SUSPENDED: 'PLAYER_REGISTRATION_SUSPENDED', CANCELLED: 'PLAYER_REGISTRATION_CANCELLED' }

export async function transitionPlayerRegistration(dataSource: DataSource, session: SsoUser, audit: PlayerRegistrationAuditContext, registrationId: string, targetStatus: PlayerRegistrationStatus, reason?: string | null): Promise<PlayerRegistration> {
  if (['REJECTED', 'SUSPENDED', 'CANCELLED'].includes(targetStatus) && !reason?.trim()) throw new PlayerRegistrationWorkflowError('Un motif est obligatoire pour cette décision')
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(PlayerRegistration)
    const registration = await repo.createQueryBuilder('registration').setLock('pessimistic_write').where('registration.id = :registrationId', { registrationId }).getOne()
    if (!registration) throw new PlayerRegistrationWorkflowError('Enregistrement joueur introuvable')
    assertAccess(session, registration)
    assertPlayerRegistrationTransition(registration.status, targetStatus)
    if (targetStatus === 'APPROVED') {
      const license = await manager.getRepository(PersonLicense).findOne({ where: { id: registration.licenseId, personType: 'PLAYER', personReferenceId: registration.playerId, clubId: registration.clubId, seasonId: registration.seasonId } })
      if (!license || !isPersonLicenseActive(license.status, license.expiresAt)) throw new PlayerRegistrationWorkflowError("La licence PLAYER liée n'est plus active")
    }
    const previous = registration.status
    registration.status = targetStatus
    registration.eligibilityStatus = eligibilityForRegistrationStatus(targetStatus)
    registration.validatedBy = audit.userId
    registration.validatedAt = new Date()
    registration.rejectionReason = ['REJECTED', 'SUSPENDED', 'CANCELLED'].includes(targetStatus) ? reason!.trim() : null
    await repo.save(registration)
    await saveHistory(manager, registrationId, audit, { action: `STATUS_${targetStatus}`, fromStatus: previous, toStatus: targetStatus, reason, beforeValue: { status: previous }, afterValue: { status: targetStatus, eligibilityStatus: registration.eligibilityStatus } })
    return registration
  })
  const eventType = EVENTS[targetStatus]
  if (eventType) await notify({ eventId: `player-registration:${registrationId}:${targetStatus}:${updated.updatedAt.toISOString()}`, type: eventType, target: { type: 'TEAM', teamId: updated.clubId }, teamId: updated.clubId, category: 'REGULATORY', title: 'Enregistrement joueur', body: `L'enregistrement est maintenant au statut ${targetStatus}.`, data: { registrationId, playerId: updated.playerId, status: targetStatus, eligibilityStatus: updated.eligibilityStatus, reason: reason ?? null } })
  return updated
}
