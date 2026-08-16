import type { DataSource } from 'typeorm'
import type { SsoUser } from './ssoSession'
import { SeasonRegulatoryCycle } from './entities'
import { assertFederalOperationScope, type FederalOperationAuditContext, recordFederalOperationAudit } from './federalOperationsCommon'
import { assertDateRange, FederalOperationWorkflowError } from './federalOperationsRules'
import { notify } from './notificationClient'

export interface FederalSeasonOperationsInput {
  insurance: { opensAt: string; closesAt: string }
  grantApplications: { opensAt: string; closesAt: string }
  documentCompliance: { opensAt: string; closesAt: string }
}

function parseWindow(input: { opensAt: string; closesAt: string }, label: string) {
  assertDateRange(input.opensAt, input.closesAt, label)
  return { open: new Date(input.opensAt), close: new Date(input.closesAt) }
}

async function loadCycle(dataSource: DataSource, session: SsoUser, cycleId: string) {
  const cycle = await dataSource.getRepository(SeasonRegulatoryCycle).findOne({ where: { id: cycleId } })
  if (!cycle) throw new FederalOperationWorkflowError('Cycle réglementaire introuvable')
  assertFederalOperationScope(session, cycle.federationId, cycle.leagueId ?? null)
  return cycle
}

export async function prepareFederalSeasonOperations(
  dataSource: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  cycleId: string,
  input: FederalSeasonOperationsInput,
) {
  const insurance = parseWindow(input.insurance, 'Campagne assurance')
  const grants = parseWindow(input.grantApplications, 'Campagne subventions')
  const documents = parseWindow(input.documentCompliance, 'Campagne documentaire')
  const updated = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(SeasonRegulatoryCycle)
    const cycle = await repo.createQueryBuilder('cycle').setLock('pessimistic_write').where('cycle.id = :cycleId', { cycleId }).getOne()
    if (!cycle) throw new FederalOperationWorkflowError('Cycle réglementaire introuvable')
    assertFederalOperationScope(session, cycle.federationId, cycle.leagueId ?? null)
    if (cycle.status === 'CLOSED') throw new FederalOperationWorkflowError('Un cycle clos ne peut plus être préparé')
    const before = {
      insuranceOpenAt: cycle.insuranceOpenAt,
      insuranceCloseAt: cycle.insuranceCloseAt,
      grantApplicationOpenAt: cycle.grantApplicationOpenAt,
      grantApplicationCloseAt: cycle.grantApplicationCloseAt,
      documentComplianceOpenAt: cycle.documentComplianceOpenAt,
      documentComplianceCloseAt: cycle.documentComplianceCloseAt,
    }
    cycle.insuranceOpenAt = insurance.open
    cycle.insuranceCloseAt = insurance.close
    cycle.grantApplicationOpenAt = grants.open
    cycle.grantApplicationCloseAt = grants.close
    cycle.documentComplianceOpenAt = documents.open
    cycle.documentComplianceCloseAt = documents.close
    await repo.save(cycle)
    await recordFederalOperationAudit(manager, audit, 'SEASON_REGULATORY_CYCLE', cycle.id, 'FEDERAL_OPERATIONS_WINDOWS_SET', before, {
      insuranceOpenAt: insurance.open,
      insuranceCloseAt: insurance.close,
      grantApplicationOpenAt: grants.open,
      grantApplicationCloseAt: grants.close,
      documentComplianceOpenAt: documents.open,
      documentComplianceCloseAt: documents.close,
    })
    return cycle
  })
  await notify({
    eventId: `season-cycle:${cycleId}:federal-operations:${insurance.open.toISOString()}`,
    type: 'FEDERAL_OPERATIONS_WINDOWS_OPENED',
    target: { type: 'ROLE', role: 'CLUB_ADMIN' },
    category: 'REGULATORY',
    title: 'Nouvelles campagnes réglementaires',
    body: `Les campagnes assurance, subventions et conformité documentaire sont planifiées pour la saison ${updated.seasonId}.`,
    data: { cycleId, seasonId: updated.seasonId },
  })
  return updated
}

async function count(dataSource: DataSource, sql: string, params: unknown[]): Promise<number> {
  const rows = await dataSource.query(sql, params) as Array<{ total: number | string }>
  return Number(rows[0]?.total ?? 0)
}

export async function getFederalSeasonReadiness(dataSource: DataSource, session: SsoUser, cycleId: string) {
  const cycle = await loadCycle(dataSource, session, cycleId)
  const seasonId = cycle.seasonId
  const [insuranceOpen, insurancePending, grantCampaigns, grantPending, requirements, documentsPending, documentsExpired] = await Promise.all([
    count(dataSource, `SELECT COUNT(*) AS total FROM club_insurance_policies WHERE season_id = ? AND status = 'ACTIVE'`, [seasonId]),
    count(dataSource, `SELECT (SELECT COUNT(*) FROM club_insurance_policies WHERE season_id = ? AND status IN ('SUBMITTED','UNDER_REVIEW')) + (SELECT COUNT(*) FROM person_insurance_policies WHERE season_id = ? AND status IN ('SUBMITTED','UNDER_REVIEW')) AS total`, [seasonId, seasonId]),
    count(dataSource, `SELECT COUNT(*) AS total FROM federation_grants WHERE season_id = ?`, [seasonId]),
    count(dataSource, `SELECT COUNT(*) AS total FROM grant_applications a JOIN federation_grants g ON g.id = a.grant_id WHERE g.season_id = ? AND a.status IN ('SUBMITTED','UNDER_REVIEW')`, [seasonId]),
    count(dataSource, `SELECT COUNT(*) AS total FROM regulatory_document_requirements WHERE season_id = ? AND active = 1`, [seasonId]),
    count(dataSource, `SELECT COUNT(*) AS total FROM regulatory_document_submissions s JOIN regulatory_document_requirements r ON r.id = s.requirement_id WHERE r.season_id = ? AND s.status IN ('SUBMITTED','UNDER_REVIEW')`, [seasonId]),
    count(dataSource, `SELECT COUNT(*) AS total FROM regulatory_document_submissions s JOIN regulatory_document_requirements r ON r.id = s.requirement_id WHERE r.season_id = ? AND (s.status = 'EXPIRED' OR (s.expires_at IS NOT NULL AND s.expires_at < CURRENT_TIMESTAMP AND s.status = 'VALID'))`, [seasonId]),
  ])
  return {
    cycleId,
    seasonId,
    status: cycle.status,
    seasonFinalizedAt: cycle.seasonFinalizedAt ?? null,
    windows: {
      insurance: { opensAt: cycle.insuranceOpenAt ?? null, closesAt: cycle.insuranceCloseAt ?? null },
      grants: { opensAt: cycle.grantApplicationOpenAt ?? null, closesAt: cycle.grantApplicationCloseAt ?? null },
      documents: { opensAt: cycle.documentComplianceOpenAt ?? null, closesAt: cycle.documentComplianceCloseAt ?? null },
    },
    insurance: { activeClubPolicies: insuranceOpen, pendingReviews: insurancePending },
    grants: { campaigns: grantCampaigns, pendingReviews: grantPending },
    documents: { requirements, pendingReviews: documentsPending, expired: documentsExpired },
    blockingItems: insurancePending + grantPending + documentsPending + documentsExpired,
  }
}

export async function finalizeFederalSeasonOperations(
  dataSource: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  cycleId: string,
) {
  const readiness = await getFederalSeasonReadiness(dataSource, session, cycleId)
  if (readiness.status !== 'CLOSED') throw new FederalOperationWorkflowError('Le cycle doit être clos avant finalisation réglementaire')
  if (readiness.blockingItems > 0) throw new FederalOperationWorkflowError(`Finalisation impossible : ${readiness.blockingItems} élément(s) réglementaire(s) restent à traiter`)
  return dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(SeasonRegulatoryCycle)
    const cycle = await repo.createQueryBuilder('cycle').setLock('pessimistic_write').where('cycle.id = :cycleId', { cycleId }).getOne()
    if (!cycle) throw new FederalOperationWorkflowError('Cycle réglementaire introuvable')
    assertFederalOperationScope(session, cycle.federationId, cycle.leagueId ?? null)
    if (!cycle.seasonFinalizedAt) {
      cycle.seasonFinalizedAt = new Date()
      await repo.save(cycle)
      await recordFederalOperationAudit(manager, audit, 'SEASON_REGULATORY_CYCLE', cycle.id, 'FEDERAL_OPERATIONS_FINALIZED', null, { seasonFinalizedAt: cycle.seasonFinalizedAt })
    }
    return cycle
  })
}
