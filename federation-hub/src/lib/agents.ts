import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { AgentWorkflowError, assertFootballAgentTransition, assertRepresentationAgreementTransition, type FootballAgentStatus, type RepresentationAgreementStatus } from '../../../packages/regulatory-shared/src/agents'
import { canAccessFederation, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { FootballAgent, FootballAgentHistory, Player, RepresentationAgreement, Team } from './entities'

export interface AgentAuditContext { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null }
export interface FootballAgentFilters { federationId?: string; status?: FootballAgentStatus }
export interface FootballAgentInput { fullName: string; fifaLicenseNumber?: string | null; federationRegistrationNumber?: string | null; contactEmail: string; contactPhone?: string | null; userId?: string | null }
export interface RepresentationAgreementInput { agentId: string; playerId?: string | null; clubId?: string | null; startDate: string; endDate: string; documentUrl?: string | null }

export class AgentAuthorizationError extends Error { constructor() { super('Forbidden'); this.name = 'AgentAuthorizationError' } }

function assertAccess(session: SsoUser, item: FootballAgent): void {
  if (canAccessPlatform(session) || canAccessFederation(session, item.federationId)) return
  throw new AgentAuthorizationError()
}

function applyScope(query: SelectQueryBuilder<FootballAgent>, session: SsoUser): void {
  if (canAccessPlatform(session)) return
  if (session.federationId) { query.andWhere('agent.federation_id = :federationId', { federationId: session.federationId }); return }
  query.andWhere('1 = 0')
}

async function saveHistory(manager: EntityManager, agentId: string, audit: AgentAuditContext, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(FootballAgentHistory)
  await repo.save(repo.create({ agentId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: audit.userId, actorRole: audit.role, reason: input.reason ?? null, afterValue: input.afterValue ?? null }))
}

export async function listFootballAgents(dataSource: DataSource, session: SsoUser, filters: FootballAgentFilters = {}) {
  const query = dataSource.getRepository(FootballAgent).createQueryBuilder('agent').orderBy('agent.created_at', 'DESC')
  applyScope(query, session)
  if (filters.federationId) query.andWhere('agent.federation_id = :filterFederationId', { filterFederationId: filters.federationId })
  if (filters.status) query.andWhere('agent.status = :status', { status: filters.status })
  return query.getMany()
}

export async function getFootballAgentBundle(dataSource: DataSource, session: SsoUser, id: string) {
  const agent = await dataSource.getRepository(FootballAgent).findOne({ where: { id } })
  if (!agent) throw new AgentWorkflowError('Agent introuvable')
  assertAccess(session, agent)
  const [agreements, history] = await Promise.all([
    dataSource.getRepository(RepresentationAgreement).find({ where: { agentId: id }, order: { createdAt: 'DESC' } }),
    dataSource.getRepository(FootballAgentHistory).find({ where: { agentId: id }, order: { createdAt: 'DESC' } }),
  ])
  const clubIds = [...new Set(agreements.flatMap((item) => item.clubId ? [item.clubId] : []))]
  const playerIds = [...new Set(agreements.flatMap((item) => item.playerId ? [item.playerId] : []))]
  const [clubs, players] = await Promise.all([
    clubIds.length ? dataSource.getRepository(Team).createQueryBuilder('club').where('club.id IN (:...ids)', { ids: clubIds }).getMany() : [],
    playerIds.length ? dataSource.getRepository(Player).createQueryBuilder('player').where('player.id IN (:...ids)', { ids: playerIds }).getMany() : [],
  ])
  const clubNames = new Map(clubs.map((item) => [item.id, item.nom]))
  const playerNames = new Map(players.map((item) => [item.id, `${item.firstNameFr} ${item.lastNameFr}`]))
  const enrichedAgreements = agreements.map((item) => Object.assign(item, { clubName: item.clubId ? clubNames.get(item.clubId) ?? item.clubId : null, playerName: item.playerId ? playerNames.get(item.playerId) ?? item.playerId : null }))
  return { agent, agreements: enrichedAgreements, history }
}

export async function createFootballAgent(dataSource: DataSource, session: SsoUser, audit: AgentAuditContext, input: FootballAgentInput): Promise<FootballAgent> {
  if (!canAccessPlatform(session) && !session.federationId) throw new AgentAuthorizationError()
  const federationId = session.federationId ?? undefined
  if (!federationId) throw new AgentWorkflowError('Fédération introuvable pour ce compte')
  return dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(FootballAgent)
    const agent = await repo.save(repo.create({ federationId, fullName: input.fullName, fifaLicenseNumber: input.fifaLicenseNumber ?? null, federationRegistrationNumber: input.federationRegistrationNumber ?? null, contactEmail: input.contactEmail, contactPhone: input.contactPhone ?? null, userId: input.userId ?? null, status: 'PENDING', createdBy: audit.userId }))
    await saveHistory(manager, agent.id, audit, { action: 'AGENT_REGISTERED', toStatus: 'PENDING', afterValue: { fullName: input.fullName } })
    return agent
  })
}

export async function transitionFootballAgent(dataSource: DataSource, session: SsoUser, audit: AgentAuditContext, id: string, targetStatus: FootballAgentStatus, input: { reason?: string | null; validFrom?: string | null; validUntil?: string | null } = {}): Promise<FootballAgent> {
  if (targetStatus === 'REVOKED' && !input.reason?.trim()) throw new AgentWorkflowError('Un motif est obligatoire pour révoquer un agent')
  return dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(FootballAgent)
    const agent = await repo.createQueryBuilder('agent').setLock('pessimistic_write').where('agent.id = :id', { id }).getOne()
    if (!agent) throw new AgentWorkflowError('Agent introuvable')
    assertAccess(session, agent)
    assertFootballAgentTransition(agent.status, targetStatus)
    const previous = agent.status
    agent.status = targetStatus
    if (targetStatus === 'ACTIVE') { agent.validFrom = input.validFrom ?? agent.validFrom ?? new Date().toISOString().slice(0, 10); agent.validUntil = input.validUntil ?? agent.validUntil ?? null }
    await repo.save(agent)
    await saveHistory(manager, id, audit, { action: `AGENT_${targetStatus}`, fromStatus: previous, toStatus: targetStatus, reason: input.reason, afterValue: { status: targetStatus } })
    return agent
  })
}

export async function createRepresentationAgreement(dataSource: DataSource, session: SsoUser, audit: AgentAuditContext, input: RepresentationAgreementInput): Promise<RepresentationAgreement> {
  if (!input.playerId && !input.clubId) throw new AgentWorkflowError('Un mandat doit concerner un joueur ou un club')
  return dataSource.transaction(async (manager) => {
    const agent = await manager.getRepository(FootballAgent).findOne({ where: { id: input.agentId } })
    if (!agent) throw new AgentWorkflowError('Agent introuvable')
    assertAccess(session, agent)
    const repo = manager.getRepository(RepresentationAgreement)
    const agreement = await repo.save(repo.create({ agentId: input.agentId, playerId: input.playerId ?? null, clubId: input.clubId ?? null, startDate: input.startDate, endDate: input.endDate, documentUrl: input.documentUrl ?? null, status: 'DRAFT', createdBy: audit.userId }))
    await saveHistory(manager, input.agentId, audit, { action: 'AGREEMENT_CREATED', afterValue: { agreementId: agreement.id, playerId: input.playerId, clubId: input.clubId } })
    return agreement
  })
}

export async function transitionRepresentationAgreement(dataSource: DataSource, session: SsoUser, audit: AgentAuditContext, id: string, targetStatus: RepresentationAgreementStatus): Promise<RepresentationAgreement> {
  return dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(RepresentationAgreement)
    const agreement = await repo.createQueryBuilder('agreement').setLock('pessimistic_write').where('agreement.id = :id', { id }).getOne()
    if (!agreement) throw new AgentWorkflowError('Mandat introuvable')
    const agent = await manager.getRepository(FootballAgent).findOne({ where: { id: agreement.agentId } })
    if (!agent) throw new AgentWorkflowError('Agent introuvable')
    assertAccess(session, agent)
    assertRepresentationAgreementTransition(agreement.status, targetStatus)
    const previous = agreement.status
    agreement.status = targetStatus
    await repo.save(agreement)
    await saveHistory(manager, agreement.agentId, audit, { action: `AGREEMENT_${targetStatus}`, fromStatus: previous, toStatus: targetStatus, afterValue: { agreementId: id, status: targetStatus } })
    return agreement
  })
}
