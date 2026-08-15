import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { assertSeasonRegulatoryCycleTransition, SeasonRegulatoryCycleWorkflowError, type SeasonRegulatoryCycleStatus } from '../../../packages/regulatory-shared/src/seasonRegulatoryCycle'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { ClubLicenseApplication, CoachQualification, League, PersonLicense, Saison, SeasonRegulatoryCycle, SeasonRegulatoryCycleHistory, StadiumInspection, TransferWindow, TransferWindowHistory } from './entities'
import { notify } from './notificationClient'

export interface SeasonRegulatoryCycleAuditContext { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null }
export interface SeasonRegulatoryCycleFilters { federationId?: string; leagueId?: string; status?: SeasonRegulatoryCycleStatus }
export interface WindowInput { opensAt: string; closesAt?: string | null }
export interface PrepareSeasonInput {
  clubLicensing: WindowInput
  personLicensing: WindowInput
  registration: WindowInput
  competitionEntry: WindowInput
  financialCompliance: WindowInput
  transferWindow: { opensAt: string; closesAt: string }
}

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

function parseWindow(input: WindowInput, label: string): { open: Date; close: Date | null } {
  const open = new Date(input.opensAt)
  const close = input.closesAt ? new Date(input.closesAt) : null
  if (Number.isNaN(open.getTime()) || (close && Number.isNaN(close.getTime()))) throw new SeasonRegulatoryCycleWorkflowError(`Dates invalides pour ${label}`)
  if (close && close <= open) throw new SeasonRegulatoryCycleWorkflowError(`La fermeture de ${label} doit être postérieure à son ouverture`)
  return { open, close }
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

async function setWindow(dataSource: DataSource, session: SsoUser, audit: SeasonRegulatoryCycleAuditContext, cycleId: string, input: WindowInput, config: { label: string; action: string; openField: 'clubLicensingOpenAt'|'personLicensingOpenAt'|'registrationOpenAt'|'competitionEntryOpenAt'|'financialComplianceOpenAt'; closeField: 'clubLicensingCloseAt'|'personLicensingCloseAt'|'registrationCloseAt'|'competitionEntryCloseAt'|'financialComplianceCloseAt'; notificationType: string; title: string }): Promise<SeasonRegulatoryCycle> {
  const parsed = parseWindow(input, config.label)
  const updated = await withCycle(dataSource, session, cycleId, async (manager, cycle) => {
    if (cycle.status === 'CLOSED') throw new SeasonRegulatoryCycleWorkflowError('Ce cycle est clos')
    cycle[config.openField] = parsed.open
    cycle[config.closeField] = parsed.close
    await saveHistory(manager, cycleId, audit, { action: config.action, afterValue: { opensAt: input.opensAt, closesAt: input.closesAt ?? null } })
  })
  await notify({ eventId: `season-cycle:${cycleId}:${config.notificationType}:${parsed.open.toISOString()}`, type: config.notificationType, target: { type: 'ROLE', role: 'CLUB_ADMIN' }, category: 'REGULATORY', title: config.title, body: `${config.title} pour la saison ${updated.seasonId}.`, data: { cycleId, seasonId: updated.seasonId, opensAt: parsed.open.toISOString(), closesAt: parsed.close?.toISOString() ?? null } })
  return updated
}

export const setClubLicensingWindow = (ds: DataSource, session: SsoUser, audit: SeasonRegulatoryCycleAuditContext, cycleId: string, input: WindowInput) => setWindow(ds, session, audit, cycleId, input, { label: 'la licence club', action: 'CLUB_LICENSING_WINDOW_SET', openField: 'clubLicensingOpenAt', closeField: 'clubLicensingCloseAt', notificationType: 'CLUB_LICENSING_WINDOW_OPENED', title: 'Ouverture des licences club' })
export const setPersonLicensingWindow = (ds: DataSource, session: SsoUser, audit: SeasonRegulatoryCycleAuditContext, cycleId: string, input: WindowInput) => setWindow(ds, session, audit, cycleId, input, { label: 'les licences individuelles', action: 'PERSON_LICENSING_WINDOW_SET', openField: 'personLicensingOpenAt', closeField: 'personLicensingCloseAt', notificationType: 'PERSON_LICENSING_WINDOW_OPENED', title: 'Ouverture des licences individuelles' })
export const setRegistrationWindow = (ds: DataSource, session: SsoUser, audit: SeasonRegulatoryCycleAuditContext, cycleId: string, input: WindowInput) => setWindow(ds, session, audit, cycleId, input, { label: "l'inscription joueurs", action: 'REGISTRATION_WINDOW_SET', openField: 'registrationOpenAt', closeField: 'registrationCloseAt', notificationType: 'REGISTRATION_WINDOW_OPENED', title: 'Ouverture des inscriptions joueurs' })
export const setCompetitionEntryWindow = (ds: DataSource, session: SsoUser, audit: SeasonRegulatoryCycleAuditContext, cycleId: string, input: WindowInput) => setWindow(ds, session, audit, cycleId, input, { label: 'les engagements compétition', action: 'COMPETITION_ENTRY_WINDOW_SET', openField: 'competitionEntryOpenAt', closeField: 'competitionEntryCloseAt', notificationType: 'COMPETITION_ENTRY_WINDOW_OPENED', title: 'Ouverture des engagements compétition' })
export const setFinancialComplianceWindow = (ds: DataSource, session: SsoUser, audit: SeasonRegulatoryCycleAuditContext, cycleId: string, input: WindowInput) => setWindow(ds, session, audit, cycleId, input, { label: 'la conformité financière', action: 'FINANCIAL_COMPLIANCE_WINDOW_SET', openField: 'financialComplianceOpenAt', closeField: 'financialComplianceCloseAt', notificationType: 'FINANCIAL_COMPLIANCE_WINDOW_OPENED', title: 'Ouverture de la conformité financière' })

async function expireApprovalsForNewSeason(manager: EntityManager, seasonStart: Date): Promise<{ stadiums: number; coachQualifications: number }> {
  const stadiums = await manager.getRepository(StadiumInspection).createQueryBuilder().update(StadiumInspection).set({ status: 'EXPIRED' }).where("status IN ('APPROVED','APPROVED_WITH_RESTRICTIONS')").andWhere('expires_at IS NOT NULL AND expires_at < :seasonStart', { seasonStart }).execute()
  const coachQualifications = await manager.getRepository(CoachQualification).createQueryBuilder().update(CoachQualification).set({ status: 'EXPIRED' }).where("status = 'VALID'").andWhere('expires_at IS NOT NULL AND expires_at < :seasonStart', { seasonStart }).execute()
  return { stadiums: stadiums.affected ?? 0, coachQualifications: coachQualifications.affected ?? 0 }
}

/**
 * Prépare en une seule opération toutes les campagnes de la saison et la
 * fenêtre SUMMER principale. Idempotent : rejouer la préparation met à jour
 * le cycle et réutilise la fenêtre SUMMER déjà créée pour le même périmètre.
 */
export async function prepareSeasonRegulatoryCycle(dataSource: DataSource, session: SsoUser, audit: SeasonRegulatoryCycleAuditContext, cycleId: string, input: PrepareSeasonInput): Promise<SeasonRegulatoryCycle> {
  const windows = {
    clubLicensing: parseWindow(input.clubLicensing, 'la licence club'),
    personLicensing: parseWindow(input.personLicensing, 'les licences individuelles'),
    registration: parseWindow(input.registration, "l'inscription joueurs"),
    competitionEntry: parseWindow(input.competitionEntry, 'les engagements compétition'),
    financialCompliance: parseWindow(input.financialCompliance, 'la conformité financière'),
    transfer: parseWindow({ opensAt: input.transferWindow.opensAt, closesAt: input.transferWindow.closesAt }, 'la fenêtre de transfert'),
  }
  const transferClose = windows.transfer.close
  if (!transferClose) throw new SeasonRegulatoryCycleWorkflowError('La fenêtre de transfert doit avoir une date de fermeture')

  return dataSource.transaction(async manager => {
    const repo = manager.getRepository(SeasonRegulatoryCycle)
    const cycle = await repo.createQueryBuilder('cycle').setLock('pessimistic_write').where('cycle.id=:cycleId',{cycleId}).getOne()
    if(!cycle) throw new SeasonRegulatoryCycleWorkflowError('Cycle réglementaire introuvable')
    assertAccess(session,cycle)
    if(cycle.status==='CLOSED') throw new SeasonRegulatoryCycleWorkflowError('Ce cycle est clos')
    const season = await manager.getRepository(Saison).findOne({ where: { id: cycle.seasonId } })
    if(!season) throw new SeasonRegulatoryCycleWorkflowError('Saison introuvable')

    cycle.clubLicensingOpenAt=windows.clubLicensing.open; cycle.clubLicensingCloseAt=windows.clubLicensing.close
    cycle.personLicensingOpenAt=windows.personLicensing.open; cycle.personLicensingCloseAt=windows.personLicensing.close
    cycle.registrationOpenAt=windows.registration.open; cycle.registrationCloseAt=windows.registration.close
    cycle.competitionEntryOpenAt=windows.competitionEntry.open; cycle.competitionEntryCloseAt=windows.competitionEntry.close
    cycle.financialComplianceOpenAt=windows.financialCompliance.open; cycle.financialComplianceCloseAt=windows.financialCompliance.close
    cycle.transferWindowOpenAt=windows.transfer.open; cycle.transferWindowCloseAt=transferClose
    cycle.seasonPreparedAt=new Date()

    const windowRepo=manager.getRepository(TransferWindow)
    const lookup=windowRepo.createQueryBuilder('window')
      .where('window.federation_id=:federationId',{federationId:cycle.federationId})
      .andWhere('window.season_id=:seasonId',{seasonId:cycle.seasonId})
      .andWhere('window.type=:type',{type:'SUMMER'})
    if(cycle.leagueId) lookup.andWhere('window.league_id=:leagueId',{leagueId:cycle.leagueId})
    else lookup.andWhere('window.league_id IS NULL')
    let transferWindow: TransferWindow | null = await lookup.getOne()
    if(!transferWindow){
      const created=windowRepo.create({federationId:cycle.federationId,leagueId:cycle.leagueId??null,seasonId:cycle.seasonId,type:'SUMMER',opensAt:windows.transfer.open,closesAt:transferClose,status:'PLANNED',createdBy:audit.userId})
      transferWindow=await windowRepo.save(created)
      const h=manager.getRepository(TransferWindowHistory);await h.save(h.create({windowId:transferWindow.id,action:'CREATED_BY_SEASON_CYCLE',actorUserId:audit.userId,actorRole:audit.role,ipAddress:audit.ipAddress??null,userAgent:audit.userAgent??null}))
    }else{
      transferWindow.opensAt=windows.transfer.open;transferWindow.closesAt=transferClose
      if(transferWindow.status==='CLOSED')transferWindow.status='PLANNED'
      transferWindow=await windowRepo.save(transferWindow)
    }

    const renewalCutoff=season.date_debut?new Date(season.date_debut):windows.clubLicensing.open
    const expired=await expireApprovalsForNewSeason(manager,renewalCutoff)
    await repo.save(cycle)
    await saveHistory(manager,cycleId,audit,{action:'SEASON_REGULATORY_PREPARED',afterValue:{transferWindowId:transferWindow.id,expiredStadiumApprovals:expired.stadiums,expiredCoachQualifications:expired.coachQualifications}})
    return cycle
  })
}

export async function activateSeasonRegulatoryCycle(dataSource: DataSource, session: SsoUser, audit: SeasonRegulatoryCycleAuditContext, cycleId: string): Promise<SeasonRegulatoryCycle> {
  return withCycle(dataSource, session, cycleId, async (manager, cycle) => {
    assertSeasonRegulatoryCycleTransition(cycle.status, 'ACTIVE')
    if(!cycle.seasonPreparedAt) throw new SeasonRegulatoryCycleWorkflowError('Préparez toutes les campagnes réglementaires avant d’activer la saison')
    const previous = cycle.status
    cycle.status = 'ACTIVE'
    await saveHistory(manager, cycleId, audit, { action: 'CYCLE_ACTIVATED', fromStatus: previous, toStatus: 'ACTIVE' })
  })
}

/** Expire les licences club/personnes APPROVED de la saison précédente encore actives. Idempotent. */
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