import type { DataSource } from 'typeorm'
import type { SsoUser } from './ssoSession'
import { buildFederalOperationScopeFilter } from './federalOperationsCommon'
import { effectiveExpiringStatus, FederalOperationWorkflowError } from './federalOperationsRules'

const EXPIRABLE_INSURANCE_STATUSES = new Set(['ACTIVE', 'SUSPENDED'])

/** FED-006 : une police ACTIVE/SUSPENDED dont expires_at est dépassé s'affiche EXPIRED sans attendre une tâche planifiée. Les statuts non entrés en vigueur (DRAFT/SUBMITTED/UNDER_REVIEW/REJECTED) ne sont jamais réécrits. */
export function withEffectiveExpiry<T extends { status: unknown; expires_at: unknown }>(row: T): T {
  const status = String(row.status)
  if (!EXPIRABLE_INSURANCE_STATUSES.has(status)) return row
  return { ...row, status: effectiveExpiringStatus(status, row.expires_at as Date | string | null) }
}

export async function listInsurancePolicies(dataSource: DataSource, session: SsoUser) {
  const clubScope = buildFederalOperationScopeFilter(session, 'p')
  const personScope = buildFederalOperationScopeFilter(session, 'p')
  const clubRows = await dataSource.query(
    `SELECT p.id, p.federation_id, p.league_id, p.season_id, p.club_id,
            NULL AS person_type, NULL AS person_id, p.policy_number, p.provider,
            p.coverage_type, p.starts_at, p.expires_at, p.status, p.document_url,
            p.submitted_at, p.reviewed_at, p.review_comment, p.created_at,
            'CLUB' AS policy_scope
       FROM club_insurance_policies p
      WHERE ${clubScope.sql}
      ORDER BY p.created_at DESC`,
    clubScope.params,
  ) as Array<Record<string, unknown>>
  const personRows = await dataSource.query(
    `SELECT p.id, p.federation_id, p.league_id, p.season_id, p.club_id,
            p.person_type, p.person_id, p.policy_number, p.provider,
            p.coverage_type, p.starts_at, p.expires_at, p.status, p.document_url,
            p.submitted_at, p.reviewed_at, p.review_comment, p.created_at,
            'PERSON' AS policy_scope
       FROM person_insurance_policies p
      WHERE ${personScope.sql}
      ORDER BY p.created_at DESC`,
    personScope.params,
  ) as Array<Record<string, unknown>>
  return [...clubRows, ...personRows]
    .map((row) => withEffectiveExpiry(row as Record<string, unknown> & { status: unknown; expires_at: unknown }))
    .sort((left, right) => String(right.created_at ?? '').localeCompare(String(left.created_at ?? '')))
}

/** FED-008/009 : lignes enfants (allocations média / bénéficiaires) pour le détail d'un dossier, une fois le scope du parent vérifié. */
export async function listBroadcastingAllocations(dataSource: DataSource, session: SsoUser, distributionId: string) {
  const scope = buildFederalOperationScopeFilter(session, 'd')
  return dataSource.query(
    `SELECT a.* FROM broadcasting_revenue_allocations a
       JOIN broadcasting_revenue_distributions d ON d.id = a.distribution_id
      WHERE a.distribution_id = ? AND ${scope.sql}
      ORDER BY a.club_id`,
    [distributionId, ...scope.params],
  )
}

export async function listTrainingCompensationBeneficiaries(dataSource: DataSource, session: SsoUser, caseId: string) {
  const scope = buildFederalOperationScopeFilter(session, 'c')
  return dataSource.query(
    `SELECT b.* FROM training_compensation_beneficiaries b
       JOIN training_compensation_cases c ON c.id = b.case_id
      WHERE b.case_id = ? AND ${scope.sql}
      ORDER BY b.club_id`,
    [caseId, ...scope.params],
  )
}

export async function listSolidarityAllocations(dataSource: DataSource, session: SsoUser, contributionId: string) {
  const scope = buildFederalOperationScopeFilter(session, 'c')
  return dataSource.query(
    `SELECT a.* FROM solidarity_allocations a
       JOIN solidarity_contributions c ON c.id = a.contribution_id
      WHERE a.contribution_id = ? AND ${scope.sql}
      ORDER BY a.club_id`,
    [contributionId, ...scope.params],
  )
}

function finiteNonNegative(value: unknown, label: string): number {
  const number = Number(value ?? 0)
  if (!Number.isFinite(number) || number < 0) throw new FederalOperationWorkflowError(`${label} invalide`)
  return number
}

export function normalizeBroadcastingAllocations(input: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(input)) return []
  return input.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new FederalOperationWorkflowError('Répartition média invalide')
    const row = raw as Record<string, unknown>
    const fixedAmount = finiteNonNegative(row.fixedAmount, 'Part fixe')
    const performanceAmount = finiteNonNegative(row.performanceAmount, 'Part performance')
    const broadcastAmount = finiteNonNegative(row.broadcastAmount, 'Part diffusion')
    const bonusAmount = finiteNonNegative(row.bonusAmount, 'Bonus')
    const deductions = finiteNonNegative(row.deductions, 'Déductions')
    const gross = fixedAmount + performanceAmount + broadcastAmount + bonusAmount
    if (deductions > gross) throw new FederalOperationWorkflowError('Les déductions ne peuvent pas dépasser la part brute du club')
    const totalAmount = Math.round((gross - deductions) * 1000) / 1000
    return { ...row, fixedAmount, performanceAmount, broadcastAmount, bonusAmount, deductions, totalAmount }
  })
}

export function assertSafeRegulatoryDocumentUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new FederalOperationWorkflowError('Document requis')
  const url = value.trim()
  if (!(url.startsWith('https://') || url.startsWith('/'))) {
    throw new FederalOperationWorkflowError('Le document doit utiliser HTTPS ou un chemin interne')
  }
  if (url.length > 5000) throw new FederalOperationWorkflowError('URL de document trop longue')
  return url
}
