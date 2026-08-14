import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { assertPlayerContractDates, assertPlayerContractFederalTransition, assertPlayerContractSubmittable, isPlayerContractHomologated, PlayerContractWorkflowError, type PlayerContractFederalStatus, type PlayerContractStatus } from '../../../packages/regulatory-shared/src/playerContract'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { Player, PlayerContract, PlayerContractDocument, PlayerContractHistory, PlayerRegistration, PlayerRegistrationHistory, Saison, Team } from './entities'
import { notify } from './notificationClient'

export interface PlayerContractAuditContext { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null }
export interface PlayerContractFilters { seasonId?: string; federationId?: string; leagueId?: string; clubId?: string; status?: PlayerContractStatus; federalStatus?: PlayerContractFederalStatus }
export class PlayerContractAuthorizationError extends Error { constructor() { super('Forbidden'); this.name = 'PlayerContractAuthorizationError' } }

function assertAccess(session: SsoUser, contract: PlayerContract): void {
  if (canAccessPlatform(session) || canAccessFederation(session, contract.federationId) || (contract.leagueId && canAccessLeague(session, contract.leagueId, contract.federationId))) return
  throw new PlayerContractAuthorizationError()
}

function applyScope(query: SelectQueryBuilder<PlayerContract>, session: SsoUser): void {
  if (canAccessPlatform(session)) return
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) { query.andWhere('contract.federation_id = :federationId', { federationId: session.federationId }); return }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) { query.andWhere('contract.league_id = :leagueId', { leagueId: session.leagueId }); return }
  query.andWhere('1 = 0')
}

export async function listPlayerContracts(dataSource: DataSource, session: SsoUser, filters: PlayerContractFilters = {}) {
  const query = dataSource.getRepository(PlayerContract).createQueryBuilder('contract').orderBy('contract.updated_at', 'DESC'); applyScope(query, session)
  if (filters.seasonId) query.andWhere('contract.season_id = :seasonId', { seasonId: filters.seasonId })
  if (filters.federationId) query.andWhere('contract.federation_id = :filterFederationId', { filterFederationId: filters.federationId })
  if (filters.leagueId) query.andWhere('contract.league_id = :filterLeagueId', { filterLeagueId: filters.leagueId })
  if (filters.clubId) query.andWhere('contract.club_id = :clubId', { clubId: filters.clubId })
  if (filters.status) query.andWhere('contract.status = :status', { status: filters.status })
  if (filters.federalStatus) query.andWhere('contract.federation_status = :federalStatus', { federalStatus: filters.federalStatus })
  const contracts = await query.getMany(); const playerIds = [...new Set(contracts.map((item) => item.playerId))]; const clubIds = [...new Set(contracts.map((item) => item.clubId))]; const seasonIds = [...new Set(contracts.map((item) => item.seasonId))]
  const [players, clubs, seasons] = await Promise.all([
    playerIds.length ? dataSource.getRepository(Player).createQueryBuilder('player').where('player.id IN (:...ids)', { ids: playerIds }).getMany() : [],
    clubIds.length ? dataSource.getRepository(Team).createQueryBuilder('club').where('club.id IN (:...ids)', { ids: clubIds }).getMany() : [],
    seasonIds.length ? dataSource.getRepository(Saison).createQueryBuilder('season').where('season.id IN (:...ids)', { ids: seasonIds }).getMany() : [],
  ])
  const playerNames = new Map(players.map((player) => [player.id, `${player.firstNameFr} ${player.lastNameFr}`])); const clubNames = new Map(clubs.map((club) => [club.id, club.nom])); const seasonNames = new Map(seasons.map((season) => [season.id, `${season.nom} · ${season.type_competition}`]))
  return contracts.map((contract) => Object.assign(contract, { playerName: playerNames.get(contract.playerId) ?? contract.playerId, clubName: clubNames.get(contract.clubId) ?? contract.clubId, seasonName: seasonNames.get(contract.seasonId) ?? contract.seasonId, homologated: isPlayerContractHomologated(contract.status, contract.federationStatus, contract.endDate) }))
}

export async function getPlayerContractBundle(dataSource: DataSource, session: SsoUser, contractId: string) {
  const contract = await dataSource.getRepository(PlayerContract).findOne({ where: { id: contractId } }); if (!contract) throw new PlayerContractWorkflowError('Contrat joueur introuvable'); assertAccess(session, contract)
  const [documents, events, rows] = await Promise.all([dataSource.getRepository(PlayerContractDocument).find({ where: { contractId }, order: { version: 'DESC' } }), dataSource.getRepository(PlayerContractHistory).find({ where: { contractId }, order: { createdAt: 'DESC' } }), listPlayerContracts(dataSource, session, { clubId: contract.clubId, seasonId: contract.seasonId })])
  return { contract: rows.find((item) => item.id === contractId) ?? contract, documents, history: events }
}

async function saveHistory(manager: EntityManager, contractId: string, audit: PlayerContractAuditContext, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; beforeValue?: Record<string, unknown> | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(PlayerContractHistory); await repo.save(repo.create({ contractId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: audit.userId, actorRole: audit.role, reason: input.reason ?? null, beforeValue: input.beforeValue ?? null, afterValue: input.afterValue ?? null, ipAddress: audit.ipAddress ?? null, userAgent: audit.userAgent ?? null }))
}

export async function transitionPlayerContract(dataSource: DataSource, session: SsoUser, audit: PlayerContractAuditContext, contractId: string, targetStatus: PlayerContractFederalStatus, reason?: string | null): Promise<PlayerContract> {
  if (['REJECTED', 'CANCELLED'].includes(targetStatus) && !reason?.trim()) throw new PlayerContractWorkflowError('Un motif est obligatoire pour cette décision')
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(PlayerContract); const contract = await repo.createQueryBuilder('contract').setLock('pessimistic_write').where('contract.id = :contractId', { contractId }).getOne()
    if (!contract) throw new PlayerContractWorkflowError('Contrat joueur introuvable'); assertAccess(session, contract); assertPlayerContractFederalTransition(contract.federationStatus, targetStatus)
    if (targetStatus === 'UNDER_REVIEW' || targetStatus === 'APPROVED') {
      const document = await manager.getRepository(PlayerContractDocument).findOne({ where: { contractId, status: 'CURRENT' } }); assertPlayerContractSubmittable(contract.status, Boolean(document)); assertPlayerContractDates(contract.startDate, contract.endDate)
      if (new Date(`${contract.endDate}T23:59:59.999Z`) < new Date()) throw new PlayerContractWorkflowError('Un contrat expiré ne peut pas être homologué')
    }
    const previous = contract.federationStatus; contract.federationStatus = targetStatus; contract.rejectionReason = targetStatus === 'REJECTED' || targetStatus === 'CANCELLED' ? reason!.trim() : null
    if (targetStatus === 'UNDER_REVIEW') contract.reviewStartedAt = new Date()
    if (targetStatus === 'APPROVED') { contract.approvedAt = new Date(); contract.approvedBy = audit.userId; contract.rejectedAt = null }
    if (targetStatus === 'REJECTED') { contract.rejectedAt = new Date(); contract.approvedAt = null; contract.approvedBy = null }
    await repo.save(contract); await saveHistory(manager, contractId, audit, { action: `FEDERAL_${targetStatus}`, fromStatus: previous, toStatus: targetStatus, reason, beforeValue: { federationStatus: previous }, afterValue: { federationStatus: targetStatus } })
    if (targetStatus === 'CANCELLED') {
      const registrations = await manager.getRepository(PlayerRegistration).find({ where: { contractId, status: 'APPROVED' } })
      for (const registration of registrations) { registration.status = 'SUSPENDED'; registration.eligibilityStatus = 'INELIGIBLE'; registration.rejectionReason = 'Homologation du contrat annulée'; await manager.getRepository(PlayerRegistration).save(registration); const auditRepo = manager.getRepository(PlayerRegistrationHistory); await auditRepo.save(auditRepo.create({ registrationId: registration.id, action: 'SUSPENDED_CONTRACT_CANCELLED', fromStatus: 'APPROVED', toStatus: 'SUSPENDED', actorUserId: audit.userId, actorRole: audit.role, reason: reason!.trim(), ipAddress: audit.ipAddress ?? null, userAgent: audit.userAgent ?? null, beforeValue: { contractId }, afterValue: { eligibilityStatus: 'INELIGIBLE' } })) }
    }
    return contract
  })
  const eventType: Partial<Record<PlayerContractFederalStatus, string>> = { UNDER_REVIEW: 'PLAYER_CONTRACT_UNDER_REVIEW', APPROVED: 'PLAYER_CONTRACT_APPROVED', REJECTED: 'PLAYER_CONTRACT_REJECTED', CANCELLED: 'PLAYER_CONTRACT_CANCELLED' }
  if (eventType[targetStatus]) await notify({ eventId: `player-contract:${contractId}:${targetStatus}:${updated.updatedAt.toISOString()}`, type: eventType[targetStatus]!, target: { type: 'TEAM', teamId: updated.clubId }, teamId: updated.clubId, category: 'REGULATORY', title: 'Contrat joueur', body: `Le contrat est maintenant au statut fédéral ${targetStatus}.`, data: { contractId, playerId: updated.playerId, status: updated.status, federalStatus: targetStatus, reason: reason ?? null } })
  return updated
}
