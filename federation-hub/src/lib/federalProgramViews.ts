import type { DataSource } from 'typeorm'
import type { SsoUser } from './ssoSession'
import { buildFederalOperationScopeFilter } from './federalOperationsCommon'
import { FederalOperationWorkflowError } from './federalOperationsRules'

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
  return [...clubRows, ...personRows].sort((left, right) => String(right.created_at ?? '').localeCompare(String(left.created_at ?? '')))
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
