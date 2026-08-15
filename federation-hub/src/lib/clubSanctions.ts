import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { assertClubSanctionTransition, blocksCompetitionEntry, blocksRegistrations, ClubSanctionWorkflowError, isClubSanctionEnforceable, requiresLiftMotivation, type ClubSanctionStatus, type ClubSanctionType } from '../../../packages/regulatory-shared/src/clubSanction'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { ClubSanction, ClubSanctionHistory, Saison, Team, TeamAffiliation } from './entities'
import { notify } from './notificationClient'

export interface ClubSanctionAuditContext { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null }
export interface ClubSanctionFilters { clubId?: string; seasonId?: string; federationId?: string; leagueId?: string; status?: ClubSanctionStatus; type?: ClubSanctionType }
export interface ClubSanctionInput { clubId: string; seasonId?: string | null; type: ClubSanctionType; reason: string; startsAt: string; endsAt?: string | null; amountDue?: string | null; currency?: string | null; sourceCaseType?: 'LEGAL_CASE' | 'DISCIPLINARY_CASE' | 'MANUAL'; sourceCaseId?: string | null }

export class ClubSanctionAuthorizationError extends Error { constructor() { super('Forbidden'); this.name = 'ClubSanctionAuthorizationError' } }

function assertAccess(session: SsoUser, sanction: ClubSanction): void {
  if (canAccessPlatform(session) || canAccessFederation(session, sanction.federationId) || (sanction.leagueId && canAccessLeague(session, sanction.leagueId, sanction.federationId))) return
  throw new ClubSanctionAuthorizationError()
}

function applyScope(query: SelectQueryBuilder<ClubSanction>, session: SsoUser): void {
  if (canAccessPlatform(session)) return
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) { query.andWhere('sanction.federation_id = :federationId', { federationId: session.federationId }); return }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) { query.andWhere('sanction.league_id = :leagueId', { leagueId: session.leagueId }); return }
  query.andWhere('1 = 0')
}

async function saveHistory(manager: EntityManager, sanctionId: string, audit: ClubSanctionAuditContext, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; beforeValue?: Record<string, unknown> | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(ClubSanctionHistory)
  await repo.save(repo.create({ sanctionId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: audit.userId, actorRole: audit.role, reason: input.reason ?? null, beforeValue: input.beforeValue ?? null, afterValue: input.afterValue ?? null, ipAddress: audit.ipAddress ?? null, userAgent: audit.userAgent ?? null }))
}

export async function listClubSanctions(dataSource: DataSource, session: SsoUser, filters: ClubSanctionFilters = {}) {
  const query = dataSource.getRepository(ClubSanction).createQueryBuilder('sanction').orderBy('sanction.created_at', 'DESC')
  applyScope(query, session)
  if (filters.clubId) query.andWhere('sanction.club_id = :clubId', { clubId: filters.clubId })
  if (filters.seasonId) query.andWhere('sanction.season_id = :seasonId', { seasonId: filters.seasonId })
  if (filters.federationId) query.andWhere('sanction.federation_id = :filterFederationId', { filterFederationId: filters.federationId })
  if (filters.leagueId) query.andWhere('sanction.league_id = :filterLeagueId', { filterLeagueId: filters.leagueId })
  if (filters.status) query.andWhere('sanction.status = :status', { status: filters.status })
  if (filters.type) query.andWhere('sanction.type = :type', { type: filters.type })
  const sanctions = await query.getMany()
  const clubIds = [...new Set(sanctions.map((item) => item.clubId))]
  const clubs = clubIds.length ? await dataSource.getRepository(Team).createQueryBuilder('club').where('club.id IN (:...ids)', { ids: clubIds }).getMany() : []
  const clubNames = new Map(clubs.map((item) => [item.id, item.nom]))
  return sanctions.map((sanction) => Object.assign(sanction, { clubName: clubNames.get(sanction.clubId) ?? sanction.clubId, enforceable: isClubSanctionEnforceable(sanction.status, sanction.startsAt, sanction.endsAt) }))
}

export async function getClubSanctionBundle(dataSource: DataSource, session: SsoUser, sanctionId: string) {
  const sanction = await dataSource.getRepository(ClubSanction).findOne({ where: { id: sanctionId } })
  if (!sanction) throw new ClubSanctionWorkflowError('Sanction introuvable')
  assertAccess(session, sanction)
  const [history, rows] = await Promise.all([
    dataSource.getRepository(ClubSanctionHistory).find({ where: { sanctionId }, order: { createdAt: 'DESC' } }),
    listClubSanctions(dataSource, session, { clubId: sanction.clubId }),
  ])
  return { sanction: rows.find((item) => item.id === sanctionId) ?? sanction, history }
}

export async function createClubSanction(dataSource: DataSource, session: SsoUser, audit: ClubSanctionAuditContext, input: ClubSanctionInput): Promise<ClubSanction> {
  if (!input.reason?.trim()) throw new ClubSanctionWorkflowError('Un motif est obligatoire pour créer une sanction')
  return dataSource.transaction(async (manager) => {
    const team = await manager.getRepository(Team).findOne({ where: { id: input.clubId } })
    if (!team) throw new ClubSanctionWorkflowError('Club introuvable')
    const affiliation = await manager.getRepository(TeamAffiliation).findOne({ where: { teamId: input.clubId, status: 'ACTIVE' } })
    if (!affiliation) throw new ClubSanctionWorkflowError('Aucune affiliation réglementaire active pour ce club')
    if (!canAccessPlatform(session) && !canAccessFederation(session, affiliation.federationId) && !(affiliation.leagueId && canAccessLeague(session, affiliation.leagueId, affiliation.federationId))) throw new ClubSanctionAuthorizationError()
    if (input.seasonId) {
      const season = await manager.getRepository(Saison).findOne({ where: { id: input.seasonId } })
      if (!season) throw new ClubSanctionWorkflowError('Compétition-saison introuvable')
    }
    const repo = manager.getRepository(ClubSanction)
    const sanction = await repo.save(repo.create({
      clubId: input.clubId,
      seasonId: input.seasonId ?? null,
      federationId: affiliation.federationId,
      leagueId: affiliation.leagueId ?? null,
      sourceCaseType: input.sourceCaseType ?? 'MANUAL',
      sourceCaseId: input.sourceCaseId ?? null,
      type: input.type,
      reason: input.reason.trim(),
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      amountDue: input.amountDue ?? null,
      currency: input.currency ?? null,
      status: 'ACTIVE',
      createdBy: audit.userId,
    }))
    await saveHistory(manager, sanction.id, audit, { action: 'SANCTION_CREATED', toStatus: 'ACTIVE', afterValue: { clubId: input.clubId, type: input.type, reason: input.reason.trim() } })
    return sanction
  }).then(async (sanction) => {
    await notify({ eventId: `club-sanction:${sanction.id}:CREATED`, type: 'CLUB_SANCTION_CREATED', target: { type: 'TEAM', teamId: sanction.clubId }, teamId: sanction.clubId, category: 'REGULATORY', title: 'Nouvelle sanction fédérale', body: `Le club fait l'objet d'une sanction ${sanction.type}.`, data: { sanctionId: sanction.id, type: sanction.type, reason: sanction.reason } })
    return sanction
  })
}

export async function transitionClubSanction(dataSource: DataSource, session: SsoUser, audit: ClubSanctionAuditContext, sanctionId: string, targetStatus: ClubSanctionStatus, reason?: string | null): Promise<ClubSanction> {
  if (requiresLiftMotivation(targetStatus) && !reason?.trim()) throw new ClubSanctionWorkflowError('Un motif est obligatoire pour lever ou annuler une sanction')
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(ClubSanction)
    const sanction = await repo.createQueryBuilder('sanction').setLock('pessimistic_write').where('sanction.id = :sanctionId', { sanctionId }).getOne()
    if (!sanction) throw new ClubSanctionWorkflowError('Sanction introuvable')
    assertAccess(session, sanction)
    assertClubSanctionTransition(sanction.status, targetStatus)
    const previous = sanction.status
    sanction.status = targetStatus
    if (targetStatus === 'LIFTED' || targetStatus === 'CANCELLED') {
      sanction.liftedAt = new Date()
      sanction.liftedBy = audit.userId
      sanction.liftReason = reason!.trim()
    }
    await repo.save(sanction)
    await saveHistory(manager, sanctionId, audit, { action: `SANCTION_${targetStatus}`, fromStatus: previous, toStatus: targetStatus, reason, beforeValue: { status: previous }, afterValue: { status: targetStatus } })
    return sanction
  })
  if (updated.status === 'LIFTED') await notify({ eventId: `club-sanction:${sanctionId}:LIFTED:${updated.updatedAt.toISOString()}`, type: 'CLUB_SANCTION_LIFTED', target: { type: 'TEAM', teamId: updated.clubId }, teamId: updated.clubId, category: 'REGULATORY', title: 'Sanction levée', body: `La sanction ${updated.type} a été levée.`, data: { sanctionId, type: updated.type, reason: reason ?? null } })
  return updated
}

/** Sanction REGISTRATION_BAN active bloquant les nouvelles inscriptions du club, ou `null`. Utilisé comme garde serveur par playerRegistrations.ts (P0-003). Accepte un DataSource ou l'EntityManager d'une transaction en cours. */
export async function hasActiveRegistrationBan(source: DataSource | EntityManager, clubId: string): Promise<ClubSanction | null> {
  const sanctions = await source.getRepository(ClubSanction).find({ where: { clubId, status: 'ACTIVE' } })
  return sanctions.find((sanction) => blocksRegistrations(sanction.type) && isClubSanctionEnforceable(sanction.status, sanction.startsAt, sanction.endsAt)) ?? null
}

/** Sanction COMPETITION_BAN/COMPETITION_EXCLUSION active bloquant l'engagement du club en compétition (portée saison ou toutes saisons), ou `null`. Utilisé comme garde serveur par competitionRegistrations.ts (P0-006). Accepte un DataSource ou l'EntityManager d'une transaction en cours. */
export async function hasActiveCompetitionBan(source: DataSource | EntityManager, clubId: string, seasonId?: string | null): Promise<ClubSanction | null> {
  const sanctions = await source.getRepository(ClubSanction).find({ where: { clubId, status: 'ACTIVE' } })
  return sanctions.find((sanction) =>
    blocksCompetitionEntry(sanction.type) &&
    isClubSanctionEnforceable(sanction.status, sanction.startsAt, sanction.endsAt) &&
    (!sanction.seasonId || sanction.seasonId === seasonId),
  ) ?? null
}

/** Marque comme EXPIRED les sanctions ACTIVE/SUSPENDED dont `endsAt` est dépassé. Appelée à la lecture (pas de cron dédié dans ce dépôt), best-effort. */
export async function expireOutdatedClubSanctions(dataSource: DataSource): Promise<number> {
  const result = await dataSource.getRepository(ClubSanction).createQueryBuilder()
    .update(ClubSanction)
    .set({ status: 'EXPIRED' })
    .where('status IN (:...statuses)', { statuses: ['ACTIVE', 'SUSPENDED'] })
    .andWhere('ends_at IS NOT NULL AND ends_at < :now', { now: new Date() })
    .execute()
  return result.affected ?? 0
}
