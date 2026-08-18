import type { DataSource } from 'typeorm'
import type { SsoUser } from './ssoSession'
import {
  assertFederalOperationScope,
  buildFederalOperationScopeFilter,
  FederalOperationInputError,
  type FederalOperationAuditContext,
  type FederalOperationSource,
  loadScopedRow,
  newFederalOperationId,
  optionalString,
  recordFederalOperationAudit,
  requireAmount,
  requireEnum,
  requireString,
} from './federalOperationsCommon'
import {
  assertAllocationDoesNotExceed,
  assertAllocationMatchesTotal,
  assertDateRange,
  computeAggregateCaseStatus,
  computeSolidarityContribution,
  FederalOperationWorkflowError,
} from './federalOperationsRules'
import { assertOperationDelegated, assertSubmissionSatisfiesSignature, type DelegatableOperation } from './regulatoryPolicyCenter'

const INSURANCE_COVERAGES = ['CLUB', 'PLAYERS', 'STAFF', 'MATCHDAY', 'OTHER'] as const
const PERSON_TYPES = ['PLAYER', 'STAFF', 'REFEREE', 'OTHER'] as const
const INSURANCE_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACTIVE', 'REJECTED', 'EXPIRED', 'SUSPENDED'] as const
const GRANT_STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'] as const
const GRANT_APPLICATION_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'PAID', 'CLOSED'] as const
const DOCUMENT_DOMAINS = ['CLUB_LICENSE', 'COMPETITION_ENTRY', 'FINANCIAL_COMPLIANCE', 'INSURANCE', 'GRANT', 'COACH_LICENSE', 'STADIUM', 'GOVERNANCE', 'CONTRACT', 'MEDICAL', 'OTHER'] as const
const DOCUMENT_APPLIES_TO = ['CLUB', 'PERSON', 'BOTH'] as const
const DOCUMENT_REVIEW_STATUSES = ['UNDER_REVIEW', 'VALID', 'REJECTED', 'EXPIRED'] as const
const DOCUMENT_VERIFICATION_METHODS = ['NONE', 'MANUAL_REVIEW', 'FEDERATION_SIGNATURE', 'THIRD_PARTY'] as const
const TRAINING_EVENTS = ['FIRST_PRO_CONTRACT', 'DOMESTIC_TRANSFER', 'OTHER'] as const

const INSURANCE_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['ACTIVE', 'REJECTED'],
  ACTIVE: ['SUSPENDED', 'EXPIRED'],
  SUSPENDED: ['ACTIVE', 'EXPIRED'],
  REJECTED: [],
  EXPIRED: [],
}

const GRANT_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ['OPEN'],
  OPEN: ['CLOSED'],
  CLOSED: ['ARCHIVED'],
  ARCHIVED: [],
}

const GRANT_APPLICATION_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'],
  APPROVED: ['PAID', 'CLOSED'],
  PARTIALLY_APPROVED: ['PAID', 'CLOSED'],
  REJECTED: ['CLOSED'],
  PAID: ['CLOSED'],
  CLOSED: [],
}

type ScopedRow = { id: string; federation_id: string; league_id: string | null; status: string }

export type FederalProgramDomain = 'insurance' | 'grants' | 'broadcasting' | 'training-compensation' | 'solidarity' | 'documents'

export async function listFederalProgramDomain(source: FederalOperationSource, session: SsoUser, domain: FederalProgramDomain) {
  const scope = buildFederalOperationScopeFilter(session, 'x')
  if (domain === 'insurance') {
    return source.query(
      `SELECT x.*, 'CLUB' AS policy_scope FROM club_insurance_policies x WHERE ${scope.sql}
       UNION ALL
       SELECT x.*, 'PERSON' AS policy_scope FROM person_insurance_policies x WHERE ${scope.sql}
       ORDER BY created_at DESC`,
      [...scope.params, ...scope.params],
    )
  }
  if (domain === 'grants') {
    return source.query(
      `SELECT x.*,
              (SELECT COUNT(*) FROM grant_applications a WHERE a.grant_id = x.id) AS applications_count
         FROM federation_grants x WHERE ${scope.sql} ORDER BY x.created_at DESC`,
      scope.params,
    )
  }
  if (domain === 'broadcasting') {
    return source.query(
      `SELECT x.*,
              (SELECT COUNT(*) FROM broadcasting_revenue_allocations a WHERE a.distribution_id = x.id) AS allocations_count
         FROM broadcasting_revenue_distributions x WHERE ${scope.sql} ORDER BY x.created_at DESC`,
      scope.params,
    )
  }
  if (domain === 'training-compensation') {
    return source.query(`SELECT x.* FROM training_compensation_cases x WHERE ${scope.sql} ORDER BY x.created_at DESC`, scope.params)
  }
  if (domain === 'solidarity') {
    return source.query(`SELECT x.* FROM solidarity_contributions x WHERE ${scope.sql} ORDER BY x.created_at DESC`, scope.params)
  }
  return source.query(`SELECT x.* FROM regulatory_document_requirements x WHERE ${scope.sql} ORDER BY x.domain, x.code`, scope.params)
}

export async function createInsurancePolicy(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  input: Record<string, unknown>,
) {
  const federationId = requireString(input.federationId, 'Fédération')
  const leagueId = optionalString(input.leagueId)
  assertFederalOperationScope(session, federationId, leagueId)
  const seasonId = requireString(input.seasonId, 'Saison')
  const policyNumber = requireString(input.policyNumber, 'Numéro de police', 120)
  const provider = requireString(input.provider, 'Assureur')
  const startsAt = requireString(input.startsAt, 'Début de couverture')
  const expiresAt = requireString(input.expiresAt, 'Fin de couverture')
  assertDateRange(startsAt, expiresAt, 'Couverture assurance')
  const policyScope = input.policyScope === 'PERSON' ? 'PERSON' : 'CLUB'
  const id = newFederalOperationId()

  await source.transaction(async manager => {
    if (policyScope === 'CLUB') {
      const clubId = requireString(input.clubId, 'Club')
      const coverageType = requireEnum(input.coverageType ?? 'CLUB', INSURANCE_COVERAGES, 'Type de couverture')
      await manager.query(
        `INSERT INTO club_insurance_policies
          (id, federation_id, league_id, season_id, club_id, policy_number, provider, coverage_type, starts_at, expires_at, document_url, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, federationId, leagueId, seasonId, clubId, policyNumber, provider, coverageType, new Date(startsAt), new Date(expiresAt), optionalString(input.documentUrl, 5000), audit.userId],
      )
    } else {
      const personType = requireEnum(input.personType, PERSON_TYPES, 'Type de personne')
      const personId = requireString(input.personId, 'Personne')
      await manager.query(
        `INSERT INTO person_insurance_policies
          (id, federation_id, league_id, season_id, person_type, person_id, club_id, policy_number, provider, coverage_type, starts_at, expires_at, document_url, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, federationId, leagueId, seasonId, personType, personId, optionalString(input.clubId), policyNumber, provider, optionalString(input.coverageType, 80) ?? 'PERSON', new Date(startsAt), new Date(expiresAt), optionalString(input.documentUrl, 5000), audit.userId],
      )
    }
    await recordFederalOperationAudit(manager, audit, 'INSURANCE', id, 'CREATED', null, { policyScope, policyNumber, provider, startsAt, expiresAt })
  })
  return { id, policyScope, status: 'DRAFT', policyNumber }
}

export async function transitionInsurancePolicy(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  policyScope: 'CLUB' | 'PERSON',
  id: string,
  targetStatus: unknown,
  comment?: string | null,
) {
  const table = policyScope === 'PERSON' ? 'person_insurance_policies' : 'club_insurance_policies'
  const row = await loadScopedRow<ScopedRow>(source, session, table, id)
  const to = requireEnum(targetStatus, INSURANCE_STATUSES, 'Statut assurance')
  if (!INSURANCE_TRANSITIONS[row.status]?.includes(to)) throw new FederalOperationWorkflowError(`Transition assurance interdite : ${row.status} -> ${to}`)
  await assertOperationDelegated(source, session, row.federation_id, row.league_id, 'insurance.review')
  await source.transaction(async manager => {
    await manager.query(
      `UPDATE ${table}
          SET status = ?,
              submitted_at = CASE WHEN ? = 'SUBMITTED' THEN CURRENT_TIMESTAMP ELSE submitted_at END,
              reviewed_at = CASE WHEN ? IN ('ACTIVE','REJECTED') THEN CURRENT_TIMESTAMP ELSE reviewed_at END,
              reviewed_by = CASE WHEN ? IN ('ACTIVE','REJECTED') THEN ? ELSE reviewed_by END,
              review_comment = CASE WHEN ? IN ('ACTIVE','REJECTED') THEN ? ELSE review_comment END
        WHERE id = ?`,
      [to, to, to, to, audit.userId, to, comment ?? null, id],
    )
    await recordFederalOperationAudit(manager, audit, 'INSURANCE', id, 'STATUS_CHANGED', { status: row.status }, { status: to }, comment)
  })
  return { id, status: to }
}

export async function createFederationGrant(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, input: Record<string, unknown>) {
  const federationId = requireString(input.federationId, 'Fédération')
  const leagueId = optionalString(input.leagueId)
  assertFederalOperationScope(session, federationId, leagueId)
  const opensAt = requireString(input.opensAt, 'Ouverture')
  const closesAt = requireString(input.closesAt, 'Clôture')
  assertDateRange(opensAt, closesAt, 'Campagne de subvention')
  const id = newFederalOperationId()
  const totalBudget = requireAmount(input.totalBudget, 'Budget total')
  const code = requireString(input.code, 'Code', 80).toUpperCase()
  const name = requireString(input.name, 'Nom')
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO federation_grants
        (id, federation_id, league_id, season_id, code, name, description, total_budget, currency, opens_at, closes_at, eligibility_rules, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, federationId, leagueId, optionalString(input.seasonId), code, name, optionalString(input.description, 10000), totalBudget, optionalString(input.currency, 3) ?? 'TND', new Date(opensAt), new Date(closesAt), input.eligibilityRules ? JSON.stringify(input.eligibilityRules) : null, audit.userId],
    )
    await recordFederalOperationAudit(manager, audit, 'GRANT', id, 'CREATED', null, { code, name, totalBudget, opensAt, closesAt })
  })
  return { id, code, name, totalBudget, status: 'DRAFT' }
}

export async function transitionFederationGrant(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, id: string, targetStatus: unknown) {
  const row = await loadScopedRow<ScopedRow>(source, session, 'federation_grants', id)
  const to = requireEnum(targetStatus, GRANT_STATUSES, 'Statut subvention')
  if (!GRANT_TRANSITIONS[row.status]?.includes(to)) throw new FederalOperationWorkflowError(`Transition subvention interdite : ${row.status} -> ${to}`)
  await assertOperationDelegated(source, session, row.federation_id, row.league_id, 'grant.manage')
  await source.transaction(async manager => {
    await manager.query(`UPDATE federation_grants SET status = ? WHERE id = ?`, [to, id])
    await recordFederalOperationAudit(manager, audit, 'GRANT', id, 'STATUS_CHANGED', { status: row.status }, { status: to })
  })
  return { id, status: to }
}

export async function createGrantApplication(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, grantId: string, input: Record<string, unknown>) {
  const grant = await loadScopedRow<ScopedRow & { total_budget: number | string }>(source, session, 'federation_grants', grantId)
  if (grant.status !== 'OPEN' && grant.status !== 'DRAFT') throw new FederalOperationWorkflowError('La campagne de subvention est fermée')
  const requestedAmount = requireAmount(input.requestedAmount, 'Montant demandé')
  const id = newFederalOperationId()
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO grant_applications
        (id, grant_id, club_id, requested_amount, purpose, budget, documents, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, grantId, requireString(input.clubId, 'Club'), requestedAmount, requireString(input.purpose, 'Objet', 10000), input.budget ? JSON.stringify(input.budget) : null, input.documents ? JSON.stringify(input.documents) : null, audit.userId],
    )
    await recordFederalOperationAudit(manager, audit, 'GRANT_APPLICATION', id, 'CREATED', null, { grantId, requestedAmount })
  })
  return { id, grantId, requestedAmount, status: 'DRAFT' }
}

async function loadGrantApplication(source: FederalOperationSource, session: SsoUser, id: string) {
  const rows = await source.query(
    `SELECT a.*, g.federation_id, g.league_id, g.total_budget
       FROM grant_applications a JOIN federation_grants g ON g.id = a.grant_id
      WHERE a.id = ? LIMIT 1`,
    [id],
  ) as Array<{ id: string; status: string; requested_amount: number | string; approved_amount: number | string | null; federation_id: string; league_id: string | null; total_budget: number | string }>
  const row = rows[0]
  if (!row) throw new Error('Demande de subvention introuvable')
  assertFederalOperationScope(session, row.federation_id, row.league_id)
  return row
}

export async function transitionGrantApplication(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  id: string,
  targetStatus: unknown,
  approvedAmount?: unknown,
  comment?: string | null,
) {
  const row = await loadGrantApplication(source, session, id)
  const to = requireEnum(targetStatus, GRANT_APPLICATION_STATUSES, 'Statut demande')
  if (!GRANT_APPLICATION_TRANSITIONS[row.status]?.includes(to)) throw new FederalOperationWorkflowError(`Transition de demande interdite : ${row.status} -> ${to}`)
  let approved: number | null = row.approved_amount == null ? null : Number(row.approved_amount)
  if (to === 'APPROVED' || to === 'PARTIALLY_APPROVED') {
    approved = requireAmount(approvedAmount, 'Montant approuvé')
    if (approved > Number(row.requested_amount)) throw new FederalOperationWorkflowError('Le montant approuvé ne peut pas dépasser le montant demandé')
  }
  await source.transaction(async manager => {
    await manager.query(
      `UPDATE grant_applications
          SET status = ?, approved_amount = ?,
              submitted_at = CASE WHEN ? = 'SUBMITTED' THEN CURRENT_TIMESTAMP ELSE submitted_at END,
              reviewed_at = CASE WHEN ? IN ('APPROVED','PARTIALLY_APPROVED','REJECTED') THEN CURRENT_TIMESTAMP ELSE reviewed_at END,
              reviewed_by = CASE WHEN ? IN ('APPROVED','PARTIALLY_APPROVED','REJECTED') THEN ? ELSE reviewed_by END,
              review_comment = CASE WHEN ? IN ('APPROVED','PARTIALLY_APPROVED','REJECTED') THEN ? ELSE review_comment END
        WHERE id = ?`,
      [to, approved, to, to, to, audit.userId, to, comment ?? null, id],
    )
    await recordFederalOperationAudit(manager, audit, 'GRANT_APPLICATION', id, 'STATUS_CHANGED', { status: row.status }, { status: to, approvedAmount: approved }, comment)
  })
  return { id, status: to, approvedAmount: approved }
}

export async function recordGrantPayment(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, applicationId: string, input: Record<string, unknown>) {
  const application = await loadGrantApplication(source, session, applicationId)
  if (!['APPROVED', 'PARTIALLY_APPROVED', 'PAID'].includes(application.status)) throw new FederalOperationWorkflowError('La demande doit être approuvée avant paiement')
  const amount = requireAmount(input.amount, 'Montant du paiement')
  const approvedAmount = Number(application.approved_amount ?? 0)
  const paidRows = await source.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM grant_payments WHERE application_id = ? AND status = 'PAID'`, [applicationId]) as Array<{ total: number | string }>
  if (Number(paidRows[0]?.total ?? 0) + amount > approvedAmount + 0.001) throw new FederalOperationWorkflowError('Le cumul des paiements dépasse le montant approuvé')
  const status = requireEnum(input.status ?? 'PLANNED', ['PLANNED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'] as const, 'Statut paiement')
  const id = newFederalOperationId()
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO grant_payments (id, application_id, amount, currency, payment_reference, status, paid_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, applicationId, amount, optionalString(input.currency, 3) ?? 'TND', optionalString(input.paymentReference), status, status === 'PAID' ? new Date() : null, audit.userId],
    )
    await recordFederalOperationAudit(manager, audit, 'GRANT_PAYMENT', id, 'RECORDED', null, { applicationId, amount, status, paymentReference: optionalString(input.paymentReference) })
  })
  return { id, applicationId, amount, status }
}

export async function createBroadcastingDistribution(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, input: Record<string, unknown>) {
  const federationId = requireString(input.federationId, 'Fédération')
  const leagueId = optionalString(input.leagueId)
  assertFederalOperationScope(session, federationId, leagueId)
  const grossAmount = requireAmount(input.grossAmount, 'Montant brut')
  const allocations = Array.isArray(input.allocations) ? input.allocations as Array<Record<string, unknown>> : []
  const totals = allocations.map(item => Number(item.totalAmount ?? 0))
  assertAllocationDoesNotExceed(grossAmount, totals, 'Répartition des droits média')
  const id = newFederalOperationId()
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO broadcasting_revenue_distributions
        (id, federation_id, league_id, season_id, competition_id, name, gross_amount, currency, distribution_rules, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, federationId, leagueId, requireString(input.seasonId, 'Saison'), optionalString(input.competitionId), requireString(input.name, 'Nom'), grossAmount, optionalString(input.currency, 3) ?? 'TND', input.distributionRules ? JSON.stringify(input.distributionRules) : null, allocations.length ? 'CALCULATED' : 'DRAFT', audit.userId],
    )
    for (const allocation of allocations) {
      const totalAmount = Number(allocation.totalAmount ?? 0)
      if (!Number.isFinite(totalAmount) || totalAmount < 0) throw new FederalOperationWorkflowError('Montant de répartition invalide')
      await manager.query(
        `INSERT INTO broadcasting_revenue_allocations
          (id, distribution_id, club_id, fixed_amount, performance_amount, broadcast_amount, bonus_amount, deductions, total_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newFederalOperationId(), id, requireString(allocation.clubId, 'Club'), Number(allocation.fixedAmount ?? 0), Number(allocation.performanceAmount ?? 0), Number(allocation.broadcastAmount ?? 0), Number(allocation.bonusAmount ?? 0), Number(allocation.deductions ?? 0), totalAmount],
      )
    }
    await recordFederalOperationAudit(manager, audit, 'BROADCASTING', id, 'CALCULATED', null, { grossAmount, allocations: totals.length })
  })
  return { id, grossAmount, status: allocations.length ? 'CALCULATED' : 'DRAFT' }
}

export async function approveBroadcastingDistribution(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, id: string) {
  const row = await loadScopedRow<ScopedRow & { gross_amount: number | string }>(source, session, 'broadcasting_revenue_distributions', id)
  if (row.status !== 'CALCULATED') throw new FederalOperationWorkflowError('La distribution doit être calculée avant approbation')
  await assertOperationDelegated(source, session, row.federation_id, row.league_id, 'broadcasting.manage')
  const allocations = await source.query(`SELECT total_amount FROM broadcasting_revenue_allocations WHERE distribution_id = ?`, [id]) as Array<{ total_amount: number | string }>
  assertAllocationDoesNotExceed(Number(row.gross_amount), allocations.map(item => Number(item.total_amount)), 'Répartition des droits média')
  await source.transaction(async manager => {
    await manager.query(`UPDATE broadcasting_revenue_distributions SET status = 'APPROVED', approved_at = CURRENT_TIMESTAMP, approved_by = ? WHERE id = ?`, [audit.userId, id])
    await manager.query(`UPDATE broadcasting_revenue_allocations SET status = 'APPROVED' WHERE distribution_id = ? AND status = 'CALCULATED'`, [id])
    await recordFederalOperationAudit(manager, audit, 'BROADCASTING', id, 'APPROVED', { status: row.status }, { status: 'APPROVED' })
  })
  return { id, status: 'APPROVED' }
}

const BROADCASTING_ALLOCATION_STATUSES = ['CALCULATED', 'APPROVED', 'PAID', 'DISPUTED'] as const
/** FED-008 : le club (relayé par la fédération) peut contester une répartition approuvée ; seule la fédération lève la contestation et enregistre le paiement. */
const BROADCASTING_ALLOCATION_TRANSITIONS: Record<string, readonly string[]> = {
  CALCULATED: ['APPROVED'],
  APPROVED: ['PAID', 'DISPUTED'],
  DISPUTED: ['APPROVED'],
  PAID: [],
}

/** FED-008 : clôture le cycle "calcul → approbation → revue club → paid/disputed" resté ouvert (aucune écriture n'atteignait jusqu'ici PAID/DISPUTED). */
export async function transitionBroadcastingAllocation(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  allocationId: string,
  targetStatus: unknown,
  input: { reason?: string | null; paymentReference?: string | null } = {},
) {
  const rows = await source.query(
    `SELECT a.*, d.federation_id, d.league_id
       FROM broadcasting_revenue_allocations a
       JOIN broadcasting_revenue_distributions d ON d.id = a.distribution_id
      WHERE a.id = ? LIMIT 1`,
    [allocationId],
  ) as Array<{ id: string; distribution_id: string; status: string; federation_id: string; league_id: string | null }>
  const row = rows[0]
  if (!row) throw new FederalOperationInputError('Répartition introuvable')
  assertFederalOperationScope(session, row.federation_id, row.league_id)
  const to = requireEnum(targetStatus, BROADCASTING_ALLOCATION_STATUSES, 'Statut de répartition')
  if (!BROADCASTING_ALLOCATION_TRANSITIONS[row.status]?.includes(to)) throw new FederalOperationWorkflowError(`Transition de répartition interdite : ${row.status} -> ${to}`)
  await assertOperationDelegated(source, session, row.federation_id, row.league_id, 'broadcasting.manage')
  if (to === 'DISPUTED' && !optionalString(input.reason, 2000)) throw new FederalOperationWorkflowError('Un motif de contestation est obligatoire')
  const paymentReference = to === 'PAID' ? optionalString(input.paymentReference, 191) : null
  await source.transaction(async manager => {
    await manager.query(
      `UPDATE broadcasting_revenue_allocations
          SET status = ?,
              payment_reference = CASE WHEN ? = 'PAID' THEN ? ELSE payment_reference END,
              paid_at = CASE WHEN ? = 'PAID' THEN CURRENT_TIMESTAMP ELSE paid_at END
        WHERE id = ?`,
      [to, to, paymentReference, to, allocationId],
    )
    await recordFederalOperationAudit(manager, audit, 'BROADCASTING_ALLOCATION', allocationId, 'STATUS_CHANGED', { status: row.status }, { status: to, paymentReference }, input.reason)
  })
  return { id: allocationId, status: to }
}

export async function createTrainingCompensationCase(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, input: Record<string, unknown>) {
  const federationId = requireString(input.federationId, 'Fédération')
  const leagueId = optionalString(input.leagueId)
  assertFederalOperationScope(session, federationId, leagueId)
  const baseAmount = requireAmount(input.baseAmount, 'Montant de référence')
  const beneficiaries = Array.isArray(input.beneficiaries) ? input.beneficiaries as Array<Record<string, unknown>> : []
  const amounts = beneficiaries.map(item => Number(item.amount ?? 0))
  assertAllocationDoesNotExceed(baseAmount, amounts, 'Indemnité de formation')
  const id = newFederalOperationId()
  const referenceNumber = optionalString(input.referenceNumber, 100) ?? `TC-${new Date().getFullYear()}-${id.slice(0, 8).toUpperCase()}`
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO training_compensation_cases
        (id, federation_id, league_id, season_id, player_id, triggering_event, reference_number, liable_club_id, base_amount, currency, status, rationale, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, federationId, leagueId, optionalString(input.seasonId), requireString(input.playerId, 'Joueur'), requireEnum(input.triggeringEvent ?? 'OTHER', TRAINING_EVENTS, 'Événement déclencheur'), referenceNumber, requireString(input.liableClubId, 'Club redevable'), baseAmount, optionalString(input.currency, 3) ?? 'TND', beneficiaries.length ? 'CALCULATED' : 'DRAFT', optionalString(input.rationale, 10000), audit.userId],
    )
    for (const beneficiary of beneficiaries) {
      const trainingStart = requireString(beneficiary.trainingStart, 'Début de formation')
      const trainingEnd = requireString(beneficiary.trainingEnd, 'Fin de formation')
      assertDateRange(trainingStart, trainingEnd, 'Période de formation')
      await manager.query(
        `INSERT INTO training_compensation_beneficiaries
          (id, case_id, club_id, training_start, training_end, seasons_count, allocation_rate, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newFederalOperationId(), id, requireString(beneficiary.clubId, 'Club bénéficiaire'), trainingStart, trainingEnd, Number(beneficiary.seasonsCount ?? 0), Number(beneficiary.allocationRate ?? 0), Number(beneficiary.amount ?? 0)],
      )
    }
    await recordFederalOperationAudit(manager, audit, 'TRAINING_COMPENSATION', id, 'CALCULATED', null, { referenceNumber, baseAmount, beneficiaries: beneficiaries.length })
  })
  return { id, referenceNumber, baseAmount, status: beneficiaries.length ? 'CALCULATED' : 'DRAFT' }
}

export async function decideTrainingCompensationCase(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, id: string, rationale?: string | null) {
  const row = await loadScopedRow<ScopedRow & { base_amount: number | string }>(source, session, 'training_compensation_cases', id)
  if (row.status !== 'CALCULATED' && row.status !== 'UNDER_REVIEW') throw new FederalOperationWorkflowError('Le dossier doit être calculé ou en instruction')
  await assertOperationDelegated(source, session, row.federation_id, row.league_id, 'training_compensation.decide')
  const beneficiaries = await source.query(`SELECT amount FROM training_compensation_beneficiaries WHERE case_id = ?`, [id]) as Array<{ amount: number | string }>
  assertAllocationDoesNotExceed(Number(row.base_amount), beneficiaries.map(item => Number(item.amount)), 'Indemnité de formation')
  await source.transaction(async manager => {
    await manager.query(`UPDATE training_compensation_cases SET status = 'DECIDED', rationale = COALESCE(?, rationale), decided_at = CURRENT_TIMESTAMP, decided_by = ? WHERE id = ?`, [rationale ?? null, audit.userId, id])
    await manager.query(`UPDATE training_compensation_beneficiaries SET status = 'APPROVED' WHERE case_id = ? AND status = 'PROPOSED'`, [id])
    await recordFederalOperationAudit(manager, audit, 'TRAINING_COMPENSATION', id, 'DECIDED', { status: row.status }, { status: 'DECIDED' }, rationale)
  })
  return { id, status: 'DECIDED' }
}

export async function createSolidarityContribution(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, input: Record<string, unknown>) {
  const federationId = requireString(input.federationId, 'Fédération')
  const leagueId = optionalString(input.leagueId)
  assertFederalOperationScope(session, federationId, leagueId)
  const transferAmount = requireAmount(input.transferAmount, 'Montant de référence')
  const contributionRate = Number(input.contributionRate)
  const contributionAmount = computeSolidarityContribution(transferAmount, contributionRate)
  const allocations = Array.isArray(input.allocations) ? input.allocations as Array<Record<string, unknown>> : []
  if (allocations.length) assertAllocationMatchesTotal(contributionAmount, allocations.map(item => Number(item.amount ?? 0)), 'Mécanisme de solidarité')
  const id = newFederalOperationId()
  const referenceNumber = optionalString(input.referenceNumber, 100) ?? `SC-${new Date().getFullYear()}-${id.slice(0, 8).toUpperCase()}`
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO solidarity_contributions
        (id, federation_id, league_id, season_id, player_id, triggering_club_id, receiving_club_id, transfer_amount, contribution_rate, contribution_amount, currency, status, reference_number, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, federationId, leagueId, optionalString(input.seasonId), requireString(input.playerId, 'Joueur'), requireString(input.triggeringClubId, 'Club déclencheur'), requireString(input.receivingClubId, 'Club receveur'), transferAmount, contributionRate, contributionAmount, optionalString(input.currency, 3) ?? 'TND', allocations.length ? 'CALCULATED' : 'DRAFT', referenceNumber, audit.userId],
    )
    for (const allocation of allocations) {
      const trainingStart = requireString(allocation.trainingStart, 'Début de formation')
      const trainingEnd = requireString(allocation.trainingEnd, 'Fin de formation')
      assertDateRange(trainingStart, trainingEnd, 'Période de solidarité')
      await manager.query(
        `INSERT INTO solidarity_allocations
          (id, contribution_id, club_id, training_start, training_end, allocation_rate, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newFederalOperationId(), id, requireString(allocation.clubId, 'Club bénéficiaire'), trainingStart, trainingEnd, Number(allocation.allocationRate ?? 0), Number(allocation.amount ?? 0)],
      )
    }
    await recordFederalOperationAudit(manager, audit, 'SOLIDARITY', id, 'CALCULATED', null, { referenceNumber, transferAmount, contributionRate, contributionAmount, allocations: allocations.length })
  })
  return { id, referenceNumber, contributionAmount, status: allocations.length ? 'CALCULATED' : 'DRAFT' }
}

export async function decideSolidarityContribution(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, id: string) {
  const row = await loadScopedRow<ScopedRow & { contribution_amount: number | string }>(source, session, 'solidarity_contributions', id)
  if (row.status !== 'CALCULATED' && row.status !== 'UNDER_REVIEW') throw new FederalOperationWorkflowError('La contribution doit être calculée ou en instruction')
  await assertOperationDelegated(source, session, row.federation_id, row.league_id, 'solidarity.decide')
  const allocations = await source.query(`SELECT amount FROM solidarity_allocations WHERE contribution_id = ?`, [id]) as Array<{ amount: number | string }>
  assertAllocationMatchesTotal(Number(row.contribution_amount), allocations.map(item => Number(item.amount)), 'Mécanisme de solidarité')
  await source.transaction(async manager => {
    await manager.query(`UPDATE solidarity_contributions SET status = 'DECIDED', decided_at = CURRENT_TIMESTAMP, decided_by = ? WHERE id = ?`, [audit.userId, id])
    await manager.query(`UPDATE solidarity_allocations SET status = 'APPROVED' WHERE contribution_id = ? AND status = 'PROPOSED'`, [id])
    await recordFederalOperationAudit(manager, audit, 'SOLIDARITY', id, 'DECIDED', { status: row.status }, { status: 'DECIDED' })
  })
  return { id, status: 'DECIDED' }
}

const BENEFICIARY_STATUSES = ['PROPOSED', 'APPROVED', 'PAID', 'DISPUTED'] as const
const BENEFICIARY_TRANSITIONS: Record<string, readonly string[]> = {
  PROPOSED: [],
  APPROVED: ['PAID', 'DISPUTED'],
  DISPUTED: ['APPROVED'],
  PAID: [],
}

interface BeneficiarySettlementTables {
  beneficiaryTable: string
  caseTable: string
  caseIdColumn: string
  caseDomain: string
  beneficiaryDomain: string
  delegatedOperation: DelegatableOperation
}

/**
 * FED-009 : ferme la partie du cycle (calcul → décision → paiement/contestation)
 * qui restait ouverte pour les indemnités de formation et la solidarité — les
 * statuts PAID/DISPUTED existaient déjà en base mais rien ne les atteignait.
 * Partagé entre training_compensation_beneficiaries et solidarity_allocations
 * qui ont un schéma identique (case_id/contribution_id, club_id, status).
 */
async function settleBeneficiary(
  tables: BeneficiarySettlementTables,
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  beneficiaryId: string,
  targetStatus: unknown,
  input: { reason?: string | null; paymentReference?: string | null } = {},
) {
  const rows = await source.query(
    `SELECT b.*, c.federation_id, c.league_id
       FROM ${tables.beneficiaryTable} b
       JOIN ${tables.caseTable} c ON c.id = b.${tables.caseIdColumn}
      WHERE b.id = ? LIMIT 1`,
    [beneficiaryId],
  ) as Array<{ id: string; status: string; federation_id: string; league_id: string | null; [key: string]: unknown }>
  const row = rows[0]
  if (!row) throw new FederalOperationInputError('Bénéficiaire introuvable')
  assertFederalOperationScope(session, row.federation_id, row.league_id)
  const to = requireEnum(targetStatus, BENEFICIARY_STATUSES, 'Statut bénéficiaire')
  if (!BENEFICIARY_TRANSITIONS[row.status]?.includes(to)) throw new FederalOperationWorkflowError(`Transition bénéficiaire interdite : ${row.status} -> ${to}`)
  await assertOperationDelegated(source, session, row.federation_id, row.league_id, tables.delegatedOperation)
  if (to === 'DISPUTED' && !optionalString(input.reason, 2000)) throw new FederalOperationWorkflowError('Un motif de contestation est obligatoire')
  const paymentReference = to === 'PAID' ? optionalString(input.paymentReference, 191) : null
  const caseId = String(row[tables.caseIdColumn])
  await source.transaction(async manager => {
    await manager.query(
      `UPDATE ${tables.beneficiaryTable}
          SET status = ?, payment_reference = CASE WHEN ? = 'PAID' THEN ? ELSE payment_reference END
        WHERE id = ?`,
      [to, to, paymentReference, beneficiaryId],
    )
    const siblings = await manager.query(`SELECT status FROM ${tables.beneficiaryTable} WHERE ${tables.caseIdColumn} = ?`, [caseId]) as Array<{ status: string }>
    const aggregate = computeAggregateCaseStatus(siblings.map(item => item.status))
    await manager.query(`UPDATE ${tables.caseTable} SET status = ? WHERE id = ? AND status NOT IN ('CLOSED')`, [aggregate, caseId])
    await recordFederalOperationAudit(manager, audit, tables.beneficiaryDomain, beneficiaryId, 'STATUS_CHANGED', { status: row.status }, { status: to, paymentReference }, input.reason)
    if (aggregate !== 'DECIDED') {
      await recordFederalOperationAudit(manager, audit, tables.caseDomain, caseId, 'AGGREGATE_STATUS_CHANGED', null, { status: aggregate })
    }
  })
  return { id: beneficiaryId, caseId, status: to }
}

export async function settleTrainingCompensationBeneficiary(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, beneficiaryId: string, targetStatus: unknown, input?: { reason?: string | null; paymentReference?: string | null }) {
  return settleBeneficiary(
    { beneficiaryTable: 'training_compensation_beneficiaries', caseTable: 'training_compensation_cases', caseIdColumn: 'case_id', caseDomain: 'TRAINING_COMPENSATION', beneficiaryDomain: 'TRAINING_COMPENSATION_BENEFICIARY', delegatedOperation: 'training_compensation.decide' },
    source, session, audit, beneficiaryId, targetStatus, input,
  )
}

export async function settleSolidarityAllocation(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, allocationId: string, targetStatus: unknown, input?: { reason?: string | null; paymentReference?: string | null }) {
  return settleBeneficiary(
    { beneficiaryTable: 'solidarity_allocations', caseTable: 'solidarity_contributions', caseIdColumn: 'contribution_id', caseDomain: 'SOLIDARITY', beneficiaryDomain: 'SOLIDARITY_ALLOCATION', delegatedOperation: 'solidarity.decide' },
    source, session, audit, allocationId, targetStatus, input,
  )
}

export async function createDocumentRequirement(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, input: Record<string, unknown>) {
  const federationId = requireString(input.federationId, 'Fédération')
  const leagueId = optionalString(input.leagueId)
  assertFederalOperationScope(session, federationId, leagueId)
  const id = newFederalOperationId()
  const domain = requireEnum(input.domain, DOCUMENT_DOMAINS, 'Domaine documentaire')
  const code = requireString(input.code, 'Code', 80).toUpperCase()
  const signatureRequired = input.signatureRequired === true || input.signatureRequired === 'true'
  const verificationMethod = requireEnum(input.verificationMethod ?? 'MANUAL_REVIEW', DOCUMENT_VERIFICATION_METHODS, 'Méthode de vérification')
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO regulatory_document_requirements
        (id, federation_id, league_id, season_id, domain, code, name, mandatory, valid_days, applies_to, instructions, signature_required, verification_method, active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, federationId, leagueId, optionalString(input.seasonId), domain, code, requireString(input.name, 'Nom'), input.mandatory === false ? 0 : 1, input.validDays == null ? null : Number(input.validDays), requireEnum(input.appliesTo ?? 'CLUB', DOCUMENT_APPLIES_TO, 'Cible documentaire'), optionalString(input.instructions, 10000), signatureRequired ? 1 : 0, verificationMethod, audit.userId],
    )
    await recordFederalOperationAudit(manager, audit, 'DOCUMENT_REQUIREMENT', id, 'CREATED', null, { domain, code, signatureRequired, verificationMethod })
  })
  return { id, domain, code, signatureRequired, verificationMethod, active: true }
}

export async function submitRegulatoryDocument(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, requirementId: string, input: Record<string, unknown>) {
  const requirement = await loadScopedRow<ScopedRow & { valid_days: number | null }>(source, session, 'regulatory_document_requirements', requirementId)
  const relatedEntityType = requireString(input.relatedEntityType, 'Type de dossier', 80)
  const relatedEntityId = requireString(input.relatedEntityId, 'Dossier')
  const versions = await source.query(
    `SELECT COALESCE(MAX(version), 0) AS version FROM regulatory_document_submissions WHERE requirement_id = ? AND related_entity_type = ? AND related_entity_id = ?`,
    [requirementId, relatedEntityType, relatedEntityId],
  ) as Array<{ version: number | string }>
  const version = Number(versions[0]?.version ?? 0) + 1
  const issuedAt = input.issuedAt ? new Date(String(input.issuedAt)) : null
  let expiresAt = input.expiresAt ? new Date(String(input.expiresAt)) : null
  if (issuedAt && requirement.valid_days && !expiresAt) {
    expiresAt = new Date(issuedAt.getTime() + Number(requirement.valid_days) * 86_400_000)
  }
  const id = newFederalOperationId()
  const signedAt = input.signedAt ? new Date(String(input.signedAt)) : null
  if (input.signedAt && Number.isNaN(signedAt?.getTime())) throw new FederalOperationInputError('Date de signature invalide')
  const signedBy = signedAt ? optionalString(input.signedBy, 191) ?? audit.userId : null
  await source.transaction(async manager => {
    await manager.query(
      `UPDATE regulatory_document_submissions SET status = 'SUPERSEDED'
        WHERE requirement_id = ? AND related_entity_type = ? AND related_entity_id = ? AND status NOT IN ('REJECTED','EXPIRED','SUPERSEDED')`,
      [requirementId, relatedEntityType, relatedEntityId],
    )
    await manager.query(
      `INSERT INTO regulatory_document_submissions
        (id, requirement_id, club_id, person_type, person_id, related_entity_type, related_entity_id, version, file_url, checksum, issued_at, expires_at, signed_at, signed_by, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, requirementId, optionalString(input.clubId), optionalString(input.personType, 50), optionalString(input.personId), relatedEntityType, relatedEntityId, version, requireString(input.fileUrl, 'Document', 5000), optionalString(input.checksum, 128), issuedAt, expiresAt, signedAt, signedBy, audit.userId],
    )
    await recordFederalOperationAudit(manager, audit, 'DOCUMENT_SUBMISSION', id, 'SUBMITTED', null, { requirementId, relatedEntityType, relatedEntityId, version, expiresAt, signedAt })
  })
  return { id, requirementId, version, status: 'SUBMITTED', expiresAt, signedAt }
}

async function loadDocumentSubmission(source: FederalOperationSource, session: SsoUser, id: string) {
  const rows = await source.query(
    `SELECT s.*, r.federation_id, r.league_id
       FROM regulatory_document_submissions s JOIN regulatory_document_requirements r ON r.id = s.requirement_id
      WHERE s.id = ? LIMIT 1`,
    [id],
  ) as Array<{ id: string; status: string; federation_id: string; league_id: string | null; requirement_id: string; signed_at: Date | string | null }>
  const row = rows[0]
  if (!row) throw new Error('Document réglementaire introuvable')
  assertFederalOperationScope(session, row.federation_id, row.league_id)
  return row
}

/** FED-007 : les demandes de subvention exigent une soumission VALID pour chaque exigence documentaire obligatoire du domaine GRANT couvrant leur périmètre (fédération/ligue/saison), avant toute approbation. */
export async function assertGrantJustificatifsSatisfied(
  source: FederalOperationSource,
  federationId: string,
  leagueId: string | null,
  seasonId: string | null,
  applicationId: string,
): Promise<void> {
  const requirements = await source.query(
    `SELECT id, name FROM regulatory_document_requirements
      WHERE federation_id = ? AND domain = 'GRANT' AND mandatory = 1 AND active = 1
        AND (league_id IS NULL OR league_id = ?)
        AND (season_id IS NULL OR season_id = ?)`,
    [federationId, leagueId, seasonId],
  ) as Array<{ id: string; name: string }>
  if (!requirements.length) return
  const missing: string[] = []
  for (const requirement of requirements) {
    const rows = await source.query(
      `SELECT 1 FROM regulatory_document_submissions
        WHERE requirement_id = ? AND related_entity_type = 'GRANT_APPLICATION' AND related_entity_id = ? AND status = 'VALID' LIMIT 1`,
      [requirement.id, applicationId],
    ) as unknown[]
    if (!rows.length) missing.push(requirement.name)
  }
  if (missing.length) throw new FederalOperationWorkflowError(`Justificatifs manquants ou non validés : ${missing.join(', ')}`)
}

export async function reviewRegulatoryDocument(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, id: string, statusValue: unknown, comment?: string | null) {
  const row = await loadDocumentSubmission(source, session, id)
  if (row.status === 'SUPERSEDED') throw new FederalOperationWorkflowError('Une version remplacée ne peut pas être revue')
  await assertOperationDelegated(source, session, row.federation_id, row.league_id, 'document_compliance.review')
  const status = requireEnum(statusValue, DOCUMENT_REVIEW_STATUSES, 'Statut document')
  if (status === 'VALID') {
    const requirementRows = await source.query(
      `SELECT signature_required FROM regulatory_document_requirements WHERE id = ?`,
      [row.requirement_id],
    ) as Array<{ signature_required: number | boolean }>
    assertSubmissionSatisfiesSignature(Boolean(requirementRows[0]?.signature_required), row.signed_at)
  }
  await source.transaction(async manager => {
    await manager.query(
      `UPDATE regulatory_document_submissions SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_comment = ? WHERE id = ?`,
      [status, audit.userId, comment ?? null, id],
    )
    await recordFederalOperationAudit(manager, audit, 'DOCUMENT_SUBMISSION', id, 'REVIEWED', { status: row.status }, { status }, comment)
  })
  return { id, status }
}
