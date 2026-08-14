import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import {
  assertClubLicenseTransition,
  assertRequirementsAllowApproval,
  ClubLicenseWorkflowError,
  type ClubLicenseRequirementStatus,
  type ClubLicenseStatus,
} from '../../../packages/regulatory-shared/src/clubLicensing'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import type { SsoUser } from './ssoSession'
import {
  ClubLicenseApplication,
  ClubLicenseDocument,
  ClubLicenseHistory,
  ClubLicenseRequirement,
} from './entities'
import { notify } from './notificationClient'

export interface ClubLicenseAuditContext {
  userId: string
  role: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface ClubLicenseFilters {
  seasonId?: string
  federationId?: string
  leagueId?: string
  clubId?: string
  status?: ClubLicenseStatus
}

export class ClubLicenseAuthorizationError extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ClubLicenseAuthorizationError'
  }
}

function assertApplicationAccess(session: SsoUser, application: ClubLicenseApplication): void {
  if (
    canAccessPlatform(session) ||
    canAccessFederation(session, application.federationId) ||
    (application.leagueId && canAccessLeague(session, application.leagueId, application.federationId))
  ) {
    return
  }
  throw new ClubLicenseAuthorizationError()
}

function applyScope(
  query: SelectQueryBuilder<ClubLicenseApplication>,
  session: SsoUser,
): void {
  if (canAccessPlatform(session)) return
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) {
    query.andWhere('application.federation_id = :scopeFederationId', {
      scopeFederationId: session.federationId,
    })
    return
  }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) {
    query.andWhere('application.league_id = :scopeLeagueId', { scopeLeagueId: session.leagueId })
    return
  }
  query.andWhere('1 = 0')
}

export async function listClubLicenseApplications(
  dataSource: DataSource,
  session: SsoUser,
  filters: ClubLicenseFilters = {},
): Promise<ClubLicenseApplication[]> {
  const query = dataSource
    .getRepository(ClubLicenseApplication)
    .createQueryBuilder('application')
    .orderBy('application.updated_at', 'DESC')

  applyScope(query, session)
  if (filters.seasonId) query.andWhere('application.season_id = :seasonId', { seasonId: filters.seasonId })
  if (filters.federationId) query.andWhere('application.federation_id = :federationId', { federationId: filters.federationId })
  if (filters.leagueId) query.andWhere('application.league_id = :leagueId', { leagueId: filters.leagueId })
  if (filters.clubId) query.andWhere('application.club_id = :clubId', { clubId: filters.clubId })
  if (filters.status) query.andWhere('application.status = :status', { status: filters.status })
  return query.getMany()
}

export async function getClubLicenseBundle(
  dataSource: DataSource,
  session: SsoUser,
  applicationId: string,
) {
  const application = await dataSource.getRepository(ClubLicenseApplication).findOne({
    where: { id: applicationId },
  })
  if (!application) throw new ClubLicenseWorkflowError('Dossier de licence introuvable')
  assertApplicationAccess(session, application)

  const [requirements, documents, history] = await Promise.all([
    dataSource.getRepository(ClubLicenseRequirement).find({
      where: { applicationId },
      order: { category: 'ASC', code: 'ASC' },
    }),
    dataSource.getRepository(ClubLicenseDocument).find({
      where: { applicationId },
      order: { uploadedAt: 'DESC' },
    }),
    dataSource.getRepository(ClubLicenseHistory).find({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    }),
  ])
  return { application, requirements, documents, history }
}

async function saveHistory(
  manager: EntityManager,
  applicationId: string,
  audit: ClubLicenseAuditContext,
  input: {
    action: string
    fromStatus?: string | null
    toStatus?: string | null
    reason?: string | null
    beforeValue?: Record<string, unknown> | null
    afterValue?: Record<string, unknown> | null
  },
): Promise<void> {
  const repo = manager.getRepository(ClubLicenseHistory)
  await repo.save(repo.create({
    applicationId,
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

const EVENT_BY_STATUS: Partial<Record<ClubLicenseStatus, string>> = {
  CHANGES_REQUESTED: 'CLUB_LICENSE_CHANGES_REQUESTED',
  APPROVED: 'CLUB_LICENSE_APPROVED',
  REJECTED: 'CLUB_LICENSE_REJECTED',
  SUSPENDED: 'CLUB_LICENSE_SUSPENDED',
}

export async function transitionClubLicense(
  dataSource: DataSource,
  session: SsoUser,
  audit: ClubLicenseAuditContext,
  applicationId: string,
  targetStatus: ClubLicenseStatus,
  reason?: string | null,
): Promise<ClubLicenseApplication> {
  if (['CHANGES_REQUESTED', 'REJECTED', 'SUSPENDED'].includes(targetStatus) && !reason?.trim()) {
    throw new ClubLicenseWorkflowError('Un motif est obligatoire pour cette décision')
  }

  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(ClubLicenseApplication)
    const application = await repo.createQueryBuilder('application')
      .setLock('pessimistic_write')
      .where('application.id = :applicationId', { applicationId })
      .getOne()
    if (!application) throw new ClubLicenseWorkflowError('Dossier de licence introuvable')
    assertApplicationAccess(session, application)
    assertClubLicenseTransition(application.status, targetStatus)

    if (targetStatus === 'APPROVED') {
      const requirements = await manager.getRepository(ClubLicenseRequirement).find({
        where: { applicationId },
      })
      assertRequirementsAllowApproval(requirements)
    }

    const previous = application.status
    const now = new Date()
    application.status = targetStatus
    application.reviewerUserId = audit.userId
    if (targetStatus === 'UNDER_REVIEW') application.reviewStartedAt = now
    if (targetStatus === 'APPROVED') {
      application.approvedAt = now
      application.rejectionReason = null
    }
    if (targetStatus === 'REJECTED') {
      application.rejectedAt = now
      application.rejectionReason = reason!.trim()
    }
    if (targetStatus === 'CHANGES_REQUESTED' || targetStatus === 'SUSPENDED') {
      application.rejectionReason = reason!.trim()
    }
    await repo.save(application)
    await saveHistory(manager, applicationId, audit, {
      action: `STATUS_${targetStatus}`,
      fromStatus: previous,
      toStatus: targetStatus,
      reason,
      beforeValue: { status: previous },
      afterValue: { status: targetStatus },
    })
    return application
  })

  const eventType = EVENT_BY_STATUS[targetStatus]
  if (eventType) {
    await notify({
      eventId: `club-license:${applicationId}:${targetStatus}:${updated.updatedAt.toISOString()}`,
      type: eventType,
      target: { type: 'TEAM', teamId: updated.clubId },
      teamId: updated.clubId,
      category: 'REGULATORY',
      title: 'Dossier de licence club',
      body: `Le dossier de licence est maintenant au statut ${targetStatus}.`,
      data: { applicationId, status: targetStatus, reason: reason ?? null },
    })
  }
  return updated
}

export async function reviewClubLicenseRequirement(
  dataSource: DataSource,
  session: SsoUser,
  audit: ClubLicenseAuditContext,
  applicationId: string,
  requirementId: string,
  status: ClubLicenseRequirementStatus,
  reviewComment?: string | null,
  waiverReason?: string | null,
): Promise<ClubLicenseRequirement> {
  if (status === 'WAIVED' && !waiverReason?.trim()) {
    throw new ClubLicenseWorkflowError('Le motif de dérogation est obligatoire')
  }
  return dataSource.transaction(async (manager) => {
    const application = await manager.getRepository(ClubLicenseApplication).findOne({
      where: { id: applicationId },
    })
    if (!application) throw new ClubLicenseWorkflowError('Dossier de licence introuvable')
    assertApplicationAccess(session, application)
    if (application.status !== 'UNDER_REVIEW') {
      throw new ClubLicenseWorkflowError("Les exigences ne peuvent être décidées qu'en cours d'examen")
    }

    const repo = manager.getRepository(ClubLicenseRequirement)
    const requirement = await repo.createQueryBuilder('requirement')
      .setLock('pessimistic_write')
      .where('requirement.id = :requirementId', { requirementId })
      .andWhere('requirement.application_id = :applicationId', { applicationId })
      .getOne()
    if (!requirement) throw new ClubLicenseWorkflowError('Exigence introuvable')

    const before = { status: requirement.status, reviewComment: requirement.reviewComment, waiverReason: requirement.waiverReason }
    requirement.status = status
    requirement.reviewComment = reviewComment?.trim() || null
    requirement.waiverReason = status === 'WAIVED' ? waiverReason!.trim() : null
    requirement.reviewedBy = audit.userId
    requirement.reviewedAt = new Date()
    await repo.save(requirement)
    await saveHistory(manager, applicationId, audit, {
      action: 'REQUIREMENT_REVIEWED',
      reason: reviewComment,
      beforeValue: { requirementId, ...before },
      afterValue: { requirementId, status, reviewComment: requirement.reviewComment, waiverReason: requirement.waiverReason },
    })
    return requirement
  })
}
