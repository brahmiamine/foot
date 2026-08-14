import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import {
  assertApprovalMetadata,
  assertPersonLicenseTransition,
  PersonLicenseWorkflowError,
  type PersonLicenseStatus,
  type PersonLicenseType,
} from '../../../packages/regulatory-shared/src/personLicensing'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import { Arbitre, PersonLicense, PersonLicenseDocument, PersonLicenseHistory, Player } from './entities'
import { notify } from './notificationClient'

export interface PersonLicenseAuditContext {
  userId: string
  role: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface PersonLicenseFilters {
  seasonId?: string
  federationId?: string
  leagueId?: string
  clubId?: string
  personType?: PersonLicenseType
  status?: PersonLicenseStatus
}

export class PersonLicenseAuthorizationError extends Error {
  constructor() {
    super('Forbidden')
    this.name = 'PersonLicenseAuthorizationError'
  }
}

function assertLicenseAccess(session: SsoUser, license: PersonLicense): void {
  if (
    canAccessPlatform(session) ||
    canAccessFederation(session, license.federationId) ||
    (license.leagueId && canAccessLeague(session, license.leagueId, license.federationId))
  ) return
  throw new PersonLicenseAuthorizationError()
}

function applyScope(query: SelectQueryBuilder<PersonLicense>, session: SsoUser): void {
  if (canAccessPlatform(session)) return
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) {
    query.andWhere('license.federation_id = :scopeFederationId', { scopeFederationId: session.federationId })
    return
  }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) {
    query.andWhere('license.league_id = :scopeLeagueId', { scopeLeagueId: session.leagueId })
    return
  }
  query.andWhere('1 = 0')
}

async function personNames(dataSource: DataSource, licenses: PersonLicense[]): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  const players = licenses.filter((license) => license.personType === 'PLAYER').map((license) => license.personReferenceId)
  const officials = licenses.filter((license) => ['REFEREE', 'MATCH_OFFICIAL'].includes(license.personType)).map((license) => license.personReferenceId)
  const staff = licenses.filter((license) => ['COACH', 'STAFF', 'MEDICAL', 'DIRECTOR'].includes(license.personType)).map((license) => license.personReferenceId)
  if (players.length) {
    const rows = await dataSource.getRepository(Player).createQueryBuilder('person').where('person.id IN (:...ids)', { ids: players }).getMany()
    for (const person of rows) names.set(`PLAYER:${person.id}`, `${person.firstNameFr} ${person.lastNameFr}`)
  }
  if (officials.length) {
    const rows = await dataSource.getRepository(Arbitre).createQueryBuilder('person').where('person.id IN (:...ids)', { ids: officials }).getMany()
    for (const person of rows) {
      names.set(`REFEREE:${person.id}`, person.nom)
      names.set(`MATCH_OFFICIAL:${person.id}`, person.nom)
    }
  }
  if (staff.length) {
    const placeholders = staff.map(() => '?').join(',')
    const rows = await dataSource.query(
      `SELECT id, first_name_fr AS firstName, last_name_fr AS lastName FROM cms_staff WHERE id IN (${placeholders})`,
      staff,
    ) as Array<{ id: string | number; firstName: string; lastName: string }>
    for (const person of rows) {
      const name = `${person.firstName} ${person.lastName}`
      for (const type of ['COACH', 'STAFF', 'MEDICAL', 'DIRECTOR']) names.set(`${type}:${person.id}`, name)
    }
  }
  return names
}

export async function listPersonLicenses(
  dataSource: DataSource,
  session: SsoUser,
  filters: PersonLicenseFilters = {},
): Promise<Array<PersonLicense & { personName: string }>> {
  const query = dataSource.getRepository(PersonLicense).createQueryBuilder('license').orderBy('license.updated_at', 'DESC')
  applyScope(query, session)
  if (filters.seasonId) query.andWhere('license.season_id = :seasonId', { seasonId: filters.seasonId })
  if (filters.federationId) query.andWhere('license.federation_id = :federationId', { federationId: filters.federationId })
  if (filters.leagueId) query.andWhere('license.league_id = :leagueId', { leagueId: filters.leagueId })
  if (filters.clubId) query.andWhere('license.club_id = :clubId', { clubId: filters.clubId })
  if (filters.personType) query.andWhere('license.person_type = :personType', { personType: filters.personType })
  if (filters.status) query.andWhere('license.status = :status', { status: filters.status })
  const licenses = await query.getMany()
  const names = await personNames(dataSource, licenses)
  return licenses.map((license) => Object.assign(license, {
    personName: names.get(`${license.personType}:${license.personReferenceId}`) ?? license.personReferenceId,
  }))
}

export async function getPersonLicenseBundle(dataSource: DataSource, session: SsoUser, licenseId: string) {
  const license = await dataSource.getRepository(PersonLicense).findOne({ where: { id: licenseId } })
  if (!license) throw new PersonLicenseWorkflowError('Demande de licence introuvable')
  assertLicenseAccess(session, license)
  const [documents, history] = await Promise.all([
    dataSource.getRepository(PersonLicenseDocument).find({ where: { licenseId }, order: { uploadedAt: 'DESC' } }),
    dataSource.getRepository(PersonLicenseHistory).find({ where: { licenseId }, order: { createdAt: 'DESC' } }),
  ])
  const names = await personNames(dataSource, [license])
  return { license: Object.assign(license, { personName: names.get(`${license.personType}:${license.personReferenceId}`) ?? license.personReferenceId }), documents, history }
}

async function saveHistory(
  manager: EntityManager,
  licenseId: string,
  audit: PersonLicenseAuditContext,
  input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; beforeValue?: Record<string, unknown> | null; afterValue?: Record<string, unknown> | null },
): Promise<void> {
  const repo = manager.getRepository(PersonLicenseHistory)
  await repo.save(repo.create({
    licenseId,
    action: input.action,
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus ?? null,
    actorUserId: audit.userId,
    actorRole: audit.role,
    reason: input.reason ?? null,
    beforeValue: input.beforeValue ?? null,
    afterValue: input.afterValue ?? null,
    ipAddress: audit.ipAddress ?? null,
    userAgent: audit.userAgent ?? null,
  }))
}

const EVENT_BY_STATUS: Partial<Record<PersonLicenseStatus, string>> = {
  APPROVED: 'PERSON_LICENSE_APPROVED',
  REJECTED: 'PERSON_LICENSE_REJECTED',
  SUSPENDED: 'PERSON_LICENSE_SUSPENDED',
  EXPIRED: 'PERSON_LICENSE_EXPIRED',
  REVOKED: 'PERSON_LICENSE_REVOKED',
}

export async function transitionPersonLicense(
  dataSource: DataSource,
  session: SsoUser,
  audit: PersonLicenseAuditContext,
  licenseId: string,
  targetStatus: PersonLicenseStatus,
  input: { reason?: string | null; licenseNumber?: string | null; category?: string | null; expiresAt?: string | Date | null } = {},
): Promise<PersonLicense> {
  if (['REJECTED', 'SUSPENDED', 'REVOKED'].includes(targetStatus) && !input.reason?.trim()) {
    throw new PersonLicenseWorkflowError('Un motif est obligatoire pour cette décision')
  }
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(PersonLicense)
    const license = await repo.createQueryBuilder('license').setLock('pessimistic_write').where('license.id = :licenseId', { licenseId }).getOne()
    if (!license) throw new PersonLicenseWorkflowError('Demande de licence introuvable')
    assertLicenseAccess(session, license)
    assertPersonLicenseTransition(license.status, targetStatus)

    if (targetStatus === 'APPROVED') {
      const licenseNumber = input.licenseNumber?.trim() || license.licenseNumber
      const expiresAt = input.expiresAt ?? license.expiresAt
      assertApprovalMetadata({ licenseNumber, expiresAt })
      const duplicate = await repo.createQueryBuilder('other')
        .where('other.license_number = :licenseNumber', { licenseNumber })
        .andWhere('other.id <> :licenseId', { licenseId })
        .getOne()
      if (duplicate) throw new PersonLicenseWorkflowError('Ce numéro de licence est déjà utilisé')
      const documents = await manager.getRepository(PersonLicenseDocument).find({ where: { licenseId } })
      const current = documents.filter((document) => document.status !== 'SUPERSEDED')
      if (current.length === 0 || current.some((document) => document.status !== 'ACCEPTED')) {
        throw new PersonLicenseWorkflowError("Toutes les pièces courantes doivent être acceptées avant l'approbation")
      }
      license.licenseNumber = licenseNumber!
      license.expiresAt = expiresAt ? new Date(expiresAt) : null
      license.category = input.category?.trim() || license.category || null
    }

    const previous = license.status
    const now = new Date()
    license.status = targetStatus
    license.approvedBy = audit.userId
    if (targetStatus === 'UNDER_REVIEW') license.reviewStartedAt = now
    if (targetStatus === 'APPROVED') {
      license.approvedAt = now
      license.rejectionReason = null
    }
    if (targetStatus === 'REJECTED') {
      license.rejectedAt = now
      license.rejectionReason = input.reason!.trim()
    }
    if (targetStatus === 'SUSPENDED' || targetStatus === 'REVOKED') license.rejectionReason = input.reason!.trim()
    await repo.save(license)
    await saveHistory(manager, licenseId, audit, {
      action: `STATUS_${targetStatus}`,
      fromStatus: previous,
      toStatus: targetStatus,
      reason: input.reason,
      beforeValue: { status: previous },
      afterValue: { status: targetStatus, licenseNumber: license.licenseNumber, expiresAt: license.expiresAt },
    })
    return license
  })

  const eventType = EVENT_BY_STATUS[targetStatus]
  if (eventType) {
    await notify({
      eventId: `person-license:${licenseId}:${targetStatus}:${updated.updatedAt.toISOString()}`,
      type: eventType,
      target: updated.clubId ? { type: 'TEAM', teamId: updated.clubId } : updated.userId ? { type: 'USER', userIds: [updated.userId] } : undefined,
      teamId: updated.clubId ?? undefined,
      category: 'REGULATORY',
      title: 'Licence individuelle',
      body: `La demande de licence est maintenant au statut ${targetStatus}.`,
      data: { licenseId, status: targetStatus, reason: input.reason ?? null },
    })
  }
  return updated
}

export async function reviewPersonLicenseDocument(
  dataSource: DataSource,
  session: SsoUser,
  audit: PersonLicenseAuditContext,
  licenseId: string,
  documentId: string,
  status: 'ACCEPTED' | 'REJECTED',
  reviewComment?: string | null,
): Promise<PersonLicenseDocument> {
  if (status === 'REJECTED' && !reviewComment?.trim()) throw new PersonLicenseWorkflowError('Un commentaire est obligatoire pour rejeter une pièce')
  return dataSource.transaction(async (manager) => {
    const license = await manager.getRepository(PersonLicense).findOne({ where: { id: licenseId } })
    if (!license) throw new PersonLicenseWorkflowError('Demande de licence introuvable')
    assertLicenseAccess(session, license)
    if (license.status !== 'UNDER_REVIEW') throw new PersonLicenseWorkflowError("Les pièces ne peuvent être examinées qu'en cours d'étude")
    const repo = manager.getRepository(PersonLicenseDocument)
    const document = await repo.createQueryBuilder('document').setLock('pessimistic_write')
      .where('document.id = :documentId', { documentId })
      .andWhere('document.license_id = :licenseId', { licenseId })
      .getOne()
    if (!document || document.status === 'SUPERSEDED') throw new PersonLicenseWorkflowError('Pièce courante introuvable')
    const previous = document.status
    document.status = status
    document.reviewComment = reviewComment?.trim() || null
    document.reviewedBy = audit.userId
    document.reviewedAt = new Date()
    await repo.save(document)
    await saveHistory(manager, licenseId, audit, {
      action: 'DOCUMENT_REVIEWED',
      reason: reviewComment,
      beforeValue: { documentId, status: previous },
      afterValue: { documentId, status },
    })
    return document
  })
}
