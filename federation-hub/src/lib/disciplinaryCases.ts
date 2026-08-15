import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { assertDisciplinaryCaseTransition, DisciplinaryCaseWorkflowError, formatDisciplinaryCaseNumber, type DisciplinaryCaseStatus, type DisciplinaryPersonType } from '../../../packages/regulatory-shared/src/disciplinaryCase'
import type { ClubSanctionType } from '../../../packages/regulatory-shared/src/clubSanction'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { ClubSanction, DisciplinaryCase, DisciplinaryCaseDecision, DisciplinaryCaseEvent, DisciplinaryCaseEvidence, DisciplinaryCaseHearing, Team, TeamAffiliation } from './entities'
import { notify } from './notificationClient'

export interface DisciplinaryCaseAuditContext { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null }
export interface DisciplinaryCaseFilters { federationId?: string; leagueId?: string; status?: DisciplinaryCaseStatus; clubId?: string }
export interface DisciplinaryCaseInput { federationId?: string; leagueId?: string | null; matchId?: string | null; clubId?: string | null; personType?: DisciplinaryPersonType | null; personId?: string | null; offenseType: string; description: string }

export class DisciplinaryCaseAuthorizationError extends Error { constructor() { super('Forbidden'); this.name = 'DisciplinaryCaseAuthorizationError' } }

function assertAccess(session: SsoUser, item: DisciplinaryCase): void {
  if (canAccessPlatform(session) || canAccessFederation(session, item.federationId) || (item.leagueId && canAccessLeague(session, item.leagueId, item.federationId))) return
  throw new DisciplinaryCaseAuthorizationError()
}

function applyScope(query: SelectQueryBuilder<DisciplinaryCase>, session: SsoUser): void {
  if (canAccessPlatform(session)) return
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) { query.andWhere('item.federation_id = :federationId', { federationId: session.federationId }); return }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) { query.andWhere('item.league_id = :leagueId', { leagueId: session.leagueId }); return }
  query.andWhere('1 = 0')
}

async function saveEvent(manager: EntityManager, caseId: string, audit: DisciplinaryCaseAuditContext, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(DisciplinaryCaseEvent)
  await repo.save(repo.create({ caseId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: audit.userId, actorRole: audit.role, reason: input.reason ?? null, afterValue: input.afterValue ?? null, ipAddress: audit.ipAddress ?? null, userAgent: audit.userAgent ?? null }))
}

export async function listDisciplinaryCases(dataSource: DataSource, session: SsoUser, filters: DisciplinaryCaseFilters = {}) {
  const query = dataSource.getRepository(DisciplinaryCase).createQueryBuilder('item').orderBy('item.opened_at', 'DESC')
  applyScope(query, session)
  if (filters.federationId) query.andWhere('item.federation_id = :filterFederationId', { filterFederationId: filters.federationId })
  if (filters.leagueId) query.andWhere('item.league_id = :filterLeagueId', { filterLeagueId: filters.leagueId })
  if (filters.status) query.andWhere('item.status = :status', { status: filters.status })
  if (filters.clubId) query.andWhere('item.club_id = :clubId', { clubId: filters.clubId })
  const rows = await query.getMany()
  const clubIds = [...new Set(rows.flatMap((item) => item.clubId ? [item.clubId] : []))]
  const clubs = clubIds.length ? await dataSource.getRepository(Team).createQueryBuilder('club').where('club.id IN (:...ids)', { ids: clubIds }).getMany() : []
  const clubNames = new Map(clubs.map((item) => [item.id, item.nom]))
  return rows.map((item) => Object.assign(item, { clubName: item.clubId ? clubNames.get(item.clubId) ?? item.clubId : null }))
}

export async function getDisciplinaryCaseBundle(dataSource: DataSource, session: SsoUser, id: string) {
  const item = await dataSource.getRepository(DisciplinaryCase).findOne({ where: { id } })
  if (!item) throw new DisciplinaryCaseWorkflowError('Dossier disciplinaire introuvable')
  assertAccess(session, item)
  const [evidence, hearings, decisions, events, rows] = await Promise.all([
    dataSource.getRepository(DisciplinaryCaseEvidence).find({ where: { caseId: id }, order: { uploadedAt: 'DESC' } }),
    dataSource.getRepository(DisciplinaryCaseHearing).find({ where: { caseId: id }, order: { scheduledAt: 'DESC' } }),
    dataSource.getRepository(DisciplinaryCaseDecision).find({ where: { caseId: id }, order: { decidedAt: 'DESC' } }),
    dataSource.getRepository(DisciplinaryCaseEvent).find({ where: { caseId: id }, order: { createdAt: 'DESC' } }),
    listDisciplinaryCases(dataSource, session, {}),
  ])
  return { case: rows.find((row) => row.id === id) ?? item, evidence, hearings, decisions, events }
}

export async function openDisciplinaryCase(dataSource: DataSource, session: SsoUser, audit: DisciplinaryCaseAuditContext, input: DisciplinaryCaseInput): Promise<DisciplinaryCase> {
  if (!input.offenseType?.trim() || !input.description?.trim()) throw new DisciplinaryCaseWorkflowError("Le type d'infraction et la description sont obligatoires")
  return dataSource.transaction(async (manager) => {
    let federationId = input.federationId ?? session.federationId ?? undefined
    let leagueId = input.leagueId ?? null
    if (input.clubId) {
      const affiliation = await manager.getRepository(TeamAffiliation).findOne({ where: { teamId: input.clubId, status: 'ACTIVE' } })
      if (affiliation) { federationId = affiliation.federationId; leagueId = leagueId ?? affiliation.leagueId ?? null }
    }
    if (!federationId) throw new DisciplinaryCaseWorkflowError('Impossible de déterminer la fédération compétente')
    if (!canAccessPlatform(session) && !canAccessFederation(session, federationId) && !(leagueId && canAccessLeague(session, leagueId, federationId))) throw new DisciplinaryCaseAuthorizationError()
    const year = new Date().getFullYear()
    const count = await manager.getRepository(DisciplinaryCase).createQueryBuilder('item').where('item.federation_id = :federationId', { federationId }).andWhere('YEAR(item.opened_at) = :year', { year }).getCount()
    const caseNumber = formatDisciplinaryCaseNumber(year, count + 1)
    const repo = manager.getRepository(DisciplinaryCase)
    const item = await repo.save(repo.create({ caseNumber, federationId, leagueId, matchId: input.matchId ?? null, clubId: input.clubId ?? null, personType: input.personType ?? null, personId: input.personId ?? null, offenseType: input.offenseType.trim(), description: input.description.trim(), status: 'OPEN', openedAt: new Date(), createdBy: audit.userId }))
    await saveEvent(manager, item.id, audit, { action: 'CASE_OPENED', toStatus: 'OPEN', afterValue: { offenseType: input.offenseType, clubId: input.clubId, personType: input.personType, personId: input.personId } })
    return item
  })
}

async function notifyClub(item: DisciplinaryCase, type: string, body: string): Promise<void> {
  if (!item.clubId) return
  await notify({ eventId: `disciplinary-case:${item.id}:${type}`, type, target: { type: 'TEAM', teamId: item.clubId }, teamId: item.clubId, category: 'REGULATORY', title: 'Discipline fédérale', body, data: { caseId: item.id, caseNumber: item.caseNumber } })
}

export async function transitionDisciplinaryCase(dataSource: DataSource, session: SsoUser, audit: DisciplinaryCaseAuditContext, id: string, targetStatus: DisciplinaryCaseStatus, reason?: string | null): Promise<DisciplinaryCase> {
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(DisciplinaryCase)
    const item = await repo.createQueryBuilder('item').setLock('pessimistic_write').where('item.id = :id', { id }).getOne()
    if (!item) throw new DisciplinaryCaseWorkflowError('Dossier disciplinaire introuvable')
    assertAccess(session, item)
    assertDisciplinaryCaseTransition(item.status, targetStatus)
    const previous = item.status
    item.status = targetStatus
    await repo.save(item)
    await saveEvent(manager, id, audit, { action: `CASE_${targetStatus}`, fromStatus: previous, toStatus: targetStatus, reason, afterValue: { status: targetStatus } })
    return item
  })
  if (updated.status === 'CLOSED') await notifyClub(updated, 'DISCIPLINARY_CASE_CLOSED', `Le dossier disciplinaire ${updated.caseNumber} est clos.`)
  return updated
}

export async function scheduleDisciplinaryHearing(dataSource: DataSource, session: SsoUser, audit: DisciplinaryCaseAuditContext, id: string, input: { scheduledAt: string; location?: string | null; notes?: string | null }): Promise<DisciplinaryCase> {
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(DisciplinaryCase)
    const item = await repo.createQueryBuilder('item').setLock('pessimistic_write').where('item.id = :id', { id }).getOne()
    if (!item) throw new DisciplinaryCaseWorkflowError('Dossier disciplinaire introuvable')
    assertAccess(session, item)
    assertDisciplinaryCaseTransition(item.status, 'HEARING_SCHEDULED')
    const hearingRepo = manager.getRepository(DisciplinaryCaseHearing)
    await hearingRepo.save(hearingRepo.create({ caseId: id, scheduledAt: new Date(input.scheduledAt), location: input.location ?? null, notes: input.notes ?? null, createdBy: audit.userId }))
    const previous = item.status
    item.status = 'HEARING_SCHEDULED'
    item.hearingDate = new Date(input.scheduledAt)
    await repo.save(item)
    await saveEvent(manager, id, audit, { action: 'HEARING_SCHEDULED', fromStatus: previous, toStatus: 'HEARING_SCHEDULED', afterValue: { scheduledAt: input.scheduledAt } })
    return item
  })
  await notifyClub(updated, 'DISCIPLINARY_HEARING_SCHEDULED', `Une audience est programmée pour le dossier ${updated.caseNumber}.`)
  return updated
}

export interface RecordDisciplinaryDecisionInput {
  summary: string
  sanctionDescription?: string | null
  clubSanction?: { type: ClubSanctionType; reason: string; startsAt: string; endsAt?: string | null; amountDue?: string | null; currency?: string | null } | null
}

export async function recordDisciplinaryDecision(dataSource: DataSource, session: SsoUser, audit: DisciplinaryCaseAuditContext, id: string, input: RecordDisciplinaryDecisionInput): Promise<DisciplinaryCase> {
  if (!input.summary?.trim()) throw new DisciplinaryCaseWorkflowError('Le résumé de la décision est obligatoire')
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(DisciplinaryCase)
    const item = await repo.createQueryBuilder('item').setLock('pessimistic_write').where('item.id = :id', { id }).getOne()
    if (!item) throw new DisciplinaryCaseWorkflowError('Dossier disciplinaire introuvable')
    assertAccess(session, item)
    assertDisciplinaryCaseTransition(item.status, 'DECIDED')
    let clubSanctionId: string | null = null
    if (input.clubSanction) {
      if (!item.clubId) throw new DisciplinaryCaseWorkflowError('Une sanction club ne peut être créée que pour un dossier lié à un club')
      const sanctionRepo = manager.getRepository(ClubSanction)
      const sanction = await sanctionRepo.save(sanctionRepo.create({ clubId: item.clubId, federationId: item.federationId, leagueId: item.leagueId ?? null, sourceCaseType: 'DISCIPLINARY_CASE', sourceCaseId: item.id, type: input.clubSanction.type, reason: input.clubSanction.reason, startsAt: new Date(input.clubSanction.startsAt), endsAt: input.clubSanction.endsAt ? new Date(input.clubSanction.endsAt) : null, amountDue: input.clubSanction.amountDue ?? null, currency: input.clubSanction.currency ?? null, status: 'ACTIVE', createdBy: audit.userId }))
      clubSanctionId = sanction.id
    }
    const decisionRepo = manager.getRepository(DisciplinaryCaseDecision)
    await decisionRepo.save(decisionRepo.create({ caseId: id, summary: input.summary.trim(), sanctionDescription: input.sanctionDescription ?? null, clubSanctionId, decidedBy: audit.userId, decidedAt: new Date() }))
    const previous = item.status
    item.status = 'DECIDED'
    item.decisionDate = new Date()
    await repo.save(item)
    await saveEvent(manager, id, audit, { action: 'CASE_DECIDED', fromStatus: previous, toStatus: 'DECIDED', afterValue: { summary: input.summary.trim(), clubSanctionId } })
    return item
  })
  await notifyClub(updated, 'DISCIPLINARY_DECISION_ISSUED', `Une décision a été rendue pour le dossier ${updated.caseNumber}.`)
  return updated
}
