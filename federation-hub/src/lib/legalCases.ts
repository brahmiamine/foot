import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { assertLegalCaseTransition, formatLegalCaseNumber, LegalCaseWorkflowError, type LegalCaseCategory, type LegalCasePartyType, type LegalCaseStatus } from '../../../packages/regulatory-shared/src/legalCase'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { LegalCase, LegalCaseDecision, LegalCaseDocument, LegalCaseEvent, LegalCaseHearing, Team, TeamAffiliation } from './entities'
import { notify } from './notificationClient'

export interface LegalCaseAuditContext { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null }
export interface LegalCaseFilters { federationId?: string; leagueId?: string; seasonId?: string; status?: LegalCaseStatus; category?: LegalCaseCategory; partyType?: LegalCasePartyType; partyId?: string }
export interface LegalCaseInput { federationId?: string; leagueId?: string | null; seasonId?: string | null; category: LegalCaseCategory; claimantType: LegalCasePartyType; claimantId: string; respondentType: LegalCasePartyType; respondentId: string; subject: string; deadline?: string | null }

export class LegalCaseAuthorizationError extends Error { constructor() { super('Forbidden'); this.name = 'LegalCaseAuthorizationError' } }

function assertAccess(session: SsoUser, legalCase: LegalCase): void {
  if (canAccessPlatform(session) || canAccessFederation(session, legalCase.federationId) || (legalCase.leagueId && canAccessLeague(session, legalCase.leagueId, legalCase.federationId))) return
  throw new LegalCaseAuthorizationError()
}

function applyScope(query: SelectQueryBuilder<LegalCase>, session: SsoUser): void {
  if (canAccessPlatform(session)) return
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) { query.andWhere('legalCase.federation_id = :federationId', { federationId: session.federationId }); return }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) { query.andWhere('legalCase.league_id = :leagueId', { leagueId: session.leagueId }); return }
  query.andWhere('1 = 0')
}

async function saveEvent(manager: EntityManager, caseId: string, audit: LegalCaseAuditContext, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; beforeValue?: Record<string, unknown> | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(LegalCaseEvent)
  await repo.save(repo.create({ caseId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: audit.userId, actorRole: audit.role, reason: input.reason ?? null, beforeValue: input.beforeValue ?? null, afterValue: input.afterValue ?? null, ipAddress: audit.ipAddress ?? null, userAgent: audit.userAgent ?? null }))
}

export async function listLegalCases(dataSource: DataSource, session: SsoUser, filters: LegalCaseFilters = {}) {
  const query = dataSource.getRepository(LegalCase).createQueryBuilder('legalCase').orderBy('legalCase.filed_at', 'DESC')
  applyScope(query, session)
  if (filters.federationId) query.andWhere('legalCase.federation_id = :filterFederationId', { filterFederationId: filters.federationId })
  if (filters.leagueId) query.andWhere('legalCase.league_id = :filterLeagueId', { filterLeagueId: filters.leagueId })
  if (filters.seasonId) query.andWhere('legalCase.season_id = :seasonId', { seasonId: filters.seasonId })
  if (filters.status) query.andWhere('legalCase.status = :status', { status: filters.status })
  if (filters.category) query.andWhere('legalCase.category = :category', { category: filters.category })
  if (filters.partyType && filters.partyId) query.andWhere('((legalCase.claimant_type = :partyType AND legalCase.claimant_id = :partyId) OR (legalCase.respondent_type = :partyType AND legalCase.respondent_id = :partyId))', { partyType: filters.partyType, partyId: filters.partyId })
  const cases = await query.getMany()
  const clubIds = [...new Set(cases.flatMap((item) => [item.claimantType === 'CLUB' ? item.claimantId : null, item.respondentType === 'CLUB' ? item.respondentId : null]).filter((id): id is string => Boolean(id)))]
  const clubs = clubIds.length ? await dataSource.getRepository(Team).createQueryBuilder('club').where('club.id IN (:...ids)', { ids: clubIds }).getMany() : []
  const clubNames = new Map(clubs.map((item) => [item.id, item.nom]))
  return cases.map((legalCase) => Object.assign(legalCase, {
    claimantName: legalCase.claimantType === 'CLUB' ? (clubNames.get(legalCase.claimantId) ?? legalCase.claimantId) : legalCase.claimantId,
    respondentName: legalCase.respondentType === 'CLUB' ? (clubNames.get(legalCase.respondentId) ?? legalCase.respondentId) : legalCase.respondentId,
  }))
}

export async function getLegalCaseBundle(dataSource: DataSource, session: SsoUser, caseId: string) {
  const legalCase = await dataSource.getRepository(LegalCase).findOne({ where: { id: caseId } })
  if (!legalCase) throw new LegalCaseWorkflowError('Litige introuvable')
  assertAccess(session, legalCase)
  const [documents, hearings, decisions, events, rows] = await Promise.all([
    dataSource.getRepository(LegalCaseDocument).find({ where: { caseId }, order: { uploadedAt: 'DESC' } }),
    dataSource.getRepository(LegalCaseHearing).find({ where: { caseId }, order: { scheduledAt: 'DESC' } }),
    dataSource.getRepository(LegalCaseDecision).find({ where: { caseId }, order: { decidedAt: 'DESC' } }),
    dataSource.getRepository(LegalCaseEvent).find({ where: { caseId }, order: { createdAt: 'DESC' } }),
    listLegalCases(dataSource, session, {}),
  ])
  return { legalCase: rows.find((item) => item.id === caseId) ?? legalCase, documents, hearings, decisions, events }
}

async function resolveScope(manager: EntityManager, session: SsoUser, input: LegalCaseInput): Promise<{ federationId: string; leagueId: string | null }> {
  const clubId = input.claimantType === 'CLUB' ? input.claimantId : input.respondentType === 'CLUB' ? input.respondentId : null
  if (clubId) {
    const affiliation = await manager.getRepository(TeamAffiliation).findOne({ where: { teamId: clubId, status: 'ACTIVE' } })
    if (!affiliation) throw new LegalCaseWorkflowError('Aucune affiliation réglementaire active pour le club concerné')
    return { federationId: affiliation.federationId, leagueId: affiliation.leagueId ?? null }
  }
  if (input.federationId) return { federationId: input.federationId, leagueId: input.leagueId ?? null }
  if (session.federationId) return { federationId: session.federationId, leagueId: input.leagueId ?? session.leagueId ?? null }
  throw new LegalCaseWorkflowError('Impossible de déterminer la fédération compétente pour ce litige')
}

export async function createLegalCase(dataSource: DataSource, session: SsoUser, audit: LegalCaseAuditContext, input: LegalCaseInput): Promise<LegalCase> {
  if (!input.subject?.trim()) throw new LegalCaseWorkflowError("L'objet du litige est obligatoire")
  const created = await dataSource.transaction(async (manager) => {
    const scope = await resolveScope(manager, session, input)
    if (!canAccessPlatform(session) && !canAccessFederation(session, scope.federationId) && !(scope.leagueId && canAccessLeague(session, scope.leagueId, scope.federationId))) throw new LegalCaseAuthorizationError()
    const year = new Date().getFullYear()
    const count = await manager.getRepository(LegalCase).createQueryBuilder('legalCase').where('legalCase.federation_id = :federationId', { federationId: scope.federationId }).andWhere('YEAR(legalCase.filed_at) = :year', { year }).getCount()
    const caseNumber = formatLegalCaseNumber(year, count + 1)
    const repo = manager.getRepository(LegalCase)
    const legalCase = await repo.save(repo.create({
      caseNumber,
      federationId: scope.federationId,
      leagueId: scope.leagueId,
      seasonId: input.seasonId ?? null,
      category: input.category,
      claimantType: input.claimantType,
      claimantId: input.claimantId,
      respondentType: input.respondentType,
      respondentId: input.respondentId,
      subject: input.subject.trim(),
      status: 'FILED',
      filedAt: new Date(),
      deadline: input.deadline ? new Date(input.deadline) : null,
      createdBy: audit.userId,
    }))
    await saveEvent(manager, legalCase.id, audit, { action: 'CASE_FILED', toStatus: 'FILED', afterValue: { category: input.category, claimantType: input.claimantType, claimantId: input.claimantId, respondentType: input.respondentType, respondentId: input.respondentId } })
    return legalCase
  })
  await notifyParties(created, 'LEGAL_CASE_CREATED', `Nouveau litige ${created.caseNumber} enregistré.`)
  return created
}

async function notifyParties(legalCase: LegalCase, type: string, body: string, extra: Record<string, unknown> = {}): Promise<void> {
  const parties = [{ type: legalCase.claimantType, id: legalCase.claimantId }, { type: legalCase.respondentType, id: legalCase.respondentId }]
  for (const party of parties) {
    if (party.type !== 'CLUB') continue
    await notify({ eventId: `legal-case:${legalCase.id}:${type}:${party.id}`, type, target: { type: 'TEAM', teamId: party.id }, teamId: party.id, category: 'REGULATORY', title: 'Litige fédéral', body, data: { caseId: legalCase.id, caseNumber: legalCase.caseNumber, ...extra } })
  }
}

export async function transitionLegalCase(dataSource: DataSource, session: SsoUser, audit: LegalCaseAuditContext, caseId: string, targetStatus: LegalCaseStatus, reason?: string | null): Promise<LegalCase> {
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(LegalCase)
    const legalCase = await repo.createQueryBuilder('legalCase').setLock('pessimistic_write').where('legalCase.id = :caseId', { caseId }).getOne()
    if (!legalCase) throw new LegalCaseWorkflowError('Litige introuvable')
    assertAccess(session, legalCase)
    assertLegalCaseTransition(legalCase.status, targetStatus)
    const previous = legalCase.status
    legalCase.status = targetStatus
    if (targetStatus === 'ADMISSIBILITY_REVIEW') legalCase.admissibilityReviewedAt = new Date()
    await repo.save(legalCase)
    await saveEvent(manager, caseId, audit, { action: `CASE_${targetStatus}`, fromStatus: previous, toStatus: targetStatus, reason, beforeValue: { status: previous }, afterValue: { status: targetStatus } })
    return legalCase
  })
  if (['INADMISSIBLE', 'WITHDRAWN', 'CLOSED'].includes(updated.status)) await notifyParties(updated, 'LEGAL_CASE_STATUS_CHANGED', `Le litige ${updated.caseNumber} est maintenant ${updated.status}.`)
  return updated
}

export async function scheduleLegalCaseHearing(dataSource: DataSource, session: SsoUser, audit: LegalCaseAuditContext, caseId: string, input: { scheduledAt: string; location?: string | null; mode?: 'IN_PERSON' | 'REMOTE' | 'WRITTEN'; notes?: string | null }): Promise<LegalCase> {
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(LegalCase)
    const legalCase = await repo.createQueryBuilder('legalCase').setLock('pessimistic_write').where('legalCase.id = :caseId', { caseId }).getOne()
    if (!legalCase) throw new LegalCaseWorkflowError('Litige introuvable')
    assertAccess(session, legalCase)
    assertLegalCaseTransition(legalCase.status, 'HEARING_SCHEDULED')
    const hearingRepo = manager.getRepository(LegalCaseHearing)
    await hearingRepo.save(hearingRepo.create({ caseId, scheduledAt: new Date(input.scheduledAt), location: input.location ?? null, mode: input.mode ?? 'IN_PERSON', notes: input.notes ?? null, held: false, createdBy: audit.userId }))
    const previous = legalCase.status
    legalCase.status = 'HEARING_SCHEDULED'
    legalCase.hearingDate = new Date(input.scheduledAt)
    await repo.save(legalCase)
    await saveEvent(manager, caseId, audit, { action: 'HEARING_SCHEDULED', fromStatus: previous, toStatus: 'HEARING_SCHEDULED', afterValue: { scheduledAt: input.scheduledAt } })
    return legalCase
  })
  await notifyParties(updated, 'LEGAL_CASE_HEARING_SCHEDULED', `Une audience est programmée pour le litige ${updated.caseNumber}.`, { hearingDate: updated.hearingDate })
  return updated
}

export async function recordLegalCaseDecision(dataSource: DataSource, session: SsoUser, audit: LegalCaseAuditContext, caseId: string, input: { summary: string; fullTextUrl?: string | null; amountAwarded?: string | null; currency?: string | null; sanctionIssued?: boolean }): Promise<LegalCase> {
  if (!input.summary?.trim()) throw new LegalCaseWorkflowError('Le résumé de la décision est obligatoire')
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(LegalCase)
    const legalCase = await repo.createQueryBuilder('legalCase').setLock('pessimistic_write').where('legalCase.id = :caseId', { caseId }).getOne()
    if (!legalCase) throw new LegalCaseWorkflowError('Litige introuvable')
    assertAccess(session, legalCase)
    assertLegalCaseTransition(legalCase.status, 'DECIDED')
    const decisionRepo = manager.getRepository(LegalCaseDecision)
    await decisionRepo.save(decisionRepo.create({ caseId, summary: input.summary.trim(), fullTextUrl: input.fullTextUrl ?? null, amountAwarded: input.amountAwarded ?? null, currency: input.currency ?? null, sanctionIssued: input.sanctionIssued ?? false, decidedBy: audit.userId, decidedAt: new Date() }))
    const previous = legalCase.status
    legalCase.status = 'DECIDED'
    legalCase.decidedAt = new Date()
    legalCase.decisionSummary = input.summary.trim()
    legalCase.amountAwarded = input.amountAwarded ?? null
    legalCase.currency = input.currency ?? null
    await repo.save(legalCase)
    await saveEvent(manager, caseId, audit, { action: 'CASE_DECIDED', fromStatus: previous, toStatus: 'DECIDED', afterValue: { summary: input.summary.trim() } })
    return legalCase
  })
  await notifyParties(updated, 'LEGAL_CASE_DECIDED', `Une décision a été rendue pour le litige ${updated.caseNumber}.`)
  return updated
}
