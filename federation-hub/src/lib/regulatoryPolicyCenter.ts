import type { DataSource } from 'typeorm'
import type { SsoUser } from './ssoSession'
import { canAccessPlatform } from '../../../packages/auth-shared/src/roles'
import { requireConfigurationChangeReason } from '../../../packages/domain-contracts/src/configuration-audit'
import {
  resolvePolicy,
  type PolicyContext,
  type PolicyRecord,
  type ResolvedPolicy,
} from '../../../packages/domain-contracts/src/policy'
import {
  assertFederalOperationScope,
  FederalOperationAuthorizationError,
  FederalOperationInputError,
  type FederalOperationAuditContext,
  type FederalOperationSource,
  newFederalOperationId,
  optionalString,
  recordFederalOperationAudit,
  requireEnum,
  requireString,
} from './federalOperationsCommon'
import { FederalOperationWorkflowError } from './federalOperationsRules'

/** FED-001 : forme de la politique réglementaire résolue par le Regulatory Policy Center. */
export interface RegulatoryPolicyValues {
  commissionRequiredForDiscipline: boolean
  commissionRequiredForAppeals: boolean
  commissionRequiredForClubLicensing: boolean
  delegatedOperations: string[]
  documentSignatureRequiredDomains: string[]
}

/** Comportement historique : aucune commission obligatoire, aucune délégation, aucune signature exigée. */
export const REGULATORY_POLICY_DEFAULTS: RegulatoryPolicyValues = {
  commissionRequiredForDiscipline: false,
  commissionRequiredForAppeals: false,
  commissionRequiredForClubLicensing: false,
  delegatedOperations: [],
  documentSignatureRequiredDomains: [],
}

export const REGULATORY_POLICY_SCOPE_TYPES = ['PLATFORM', 'FEDERATION', 'LEAGUE', 'SEASON'] as const
export type RegulatoryPolicyScopeType = (typeof REGULATORY_POLICY_SCOPE_TYPES)[number]

/** FED-004 : catalogue fermé des opérations qu'une fédération peut déléguer à une ligue. */
export const DELEGATABLE_OPERATIONS = [
  'insurance.review',
  'grant.manage',
  'grant.review',
  'broadcasting.manage',
  'training_compensation.decide',
  'solidarity.decide',
  'document_compliance.review',
  'club_license.approve',
  'discipline.decide',
  'appeal.decide',
] as const
export type DelegatableOperation = (typeof DELEGATABLE_OPERATIONS)[number]

interface PolicyRow {
  id: string
  scope_type: RegulatoryPolicyScopeType
  scope_id: string | null
  federation_id: string
  league_id: string | null
  version: number
  effective_from: Date | string | null
  effective_until: Date | string | null
  values_json: string | Partial<RegulatoryPolicyValues>
  reason: string
  created_by: string
  created_at: Date | string
}

function parseValues(row: PolicyRow): Partial<RegulatoryPolicyValues> {
  return typeof row.values_json === 'string' ? JSON.parse(row.values_json) : row.values_json
}

function toPolicyRecord(row: PolicyRow): PolicyRecord<RegulatoryPolicyValues> {
  return {
    id: row.id,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    version: row.version,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    values: parseValues(row),
  }
}

/** Validation stricte des clés/valeurs de policy — jamais de clé inconnue silencieusement acceptée. */
export function sanitizeRegulatoryPolicyValues(input: unknown): Partial<RegulatoryPolicyValues> {
  if (!input || typeof input !== 'object') throw new FederalOperationInputError('Valeurs de politique réglementaire invalides')
  const raw = input as Record<string, unknown>
  const out: Partial<RegulatoryPolicyValues> = {}
  const knownKeys = new Set(Object.keys(REGULATORY_POLICY_DEFAULTS))
  for (const key of Object.keys(raw)) {
    if (!knownKeys.has(key)) throw new FederalOperationInputError(`Clé de politique réglementaire inconnue : ${key}`)
  }
  if ('commissionRequiredForDiscipline' in raw) out.commissionRequiredForDiscipline = Boolean(raw.commissionRequiredForDiscipline)
  if ('commissionRequiredForAppeals' in raw) out.commissionRequiredForAppeals = Boolean(raw.commissionRequiredForAppeals)
  if ('commissionRequiredForClubLicensing' in raw) out.commissionRequiredForClubLicensing = Boolean(raw.commissionRequiredForClubLicensing)
  if ('delegatedOperations' in raw) {
    if (!Array.isArray(raw.delegatedOperations)) throw new FederalOperationInputError('Opérations déléguées invalides')
    const ops = raw.delegatedOperations.map((value) => String(value))
    for (const op of ops) {
      if (!(DELEGATABLE_OPERATIONS as readonly string[]).includes(op)) throw new FederalOperationInputError(`Opération non délégable : ${op}`)
    }
    out.delegatedOperations = [...new Set(ops)]
  }
  if ('documentSignatureRequiredDomains' in raw) {
    if (!Array.isArray(raw.documentSignatureRequiredDomains)) throw new FederalOperationInputError('Domaines de signature invalides')
    out.documentSignatureRequiredDomains = [...new Set(raw.documentSignatureRequiredDomains.map((value) => String(value)))]
  }
  if (Object.keys(out).length === 0) throw new FederalOperationInputError('Aucune valeur de politique réglementaire fournie')
  return out
}

/** FED-004, partie pure : une fédération/la plateforme a toujours compétence ; une ligue doit s'être vu déléguer explicitement l'opération. */
export function assertOperationDelegatedPure(
  role: string,
  leagueId: string | null | undefined,
  delegatedOperations: readonly string[],
  operationKey: DelegatableOperation,
): void {
  if (role !== 'LEAGUE_ADMIN') return
  if (!leagueId) return
  if (!delegatedOperations.includes(operationKey)) {
    throw new FederalOperationAuthorizationError(`Cette opération n'a pas été déléguée à cette ligue par la fédération : ${operationKey}`)
  }
}

/** FED-005, partie pure : une décision ne peut être rendue sans décision de commission signée si la policy l'exige. */
export function assertCommissionDecisionRequiredPure(required: boolean, hasSignedCommissionDecision: boolean, label: string): void {
  if (required && !hasSignedCommissionDecision) {
    throw new FederalOperationWorkflowError(`${label} : une décision de commission signée (quorum atteint) est requise avant de statuer`)
  }
}

/** FED-003, partie pure : une soumission documentaire dont l'exigence impose une signature doit porter une signature. */
export function assertSubmissionSatisfiesSignature(signatureRequired: boolean, signedAt: Date | string | null | undefined): void {
  if (signatureRequired && !signedAt) {
    throw new FederalOperationWorkflowError('Une signature est requise sur ce document réglementaire avant validation')
  }
}

async function loadPolicyRows(
  source: FederalOperationSource,
  federationId: string,
): Promise<PolicyRow[]> {
  return source.query(
    `SELECT * FROM federal_regulatory_policies WHERE federation_id = ? OR scope_type = 'PLATFORM' ORDER BY scope_type, scope_id, version`,
    [federationId],
  ) as Promise<PolicyRow[]>
}

/** Résout la policy effective pour un scope donné, avec la provenance de chaque valeur (FED-001). */
export async function resolveRegulatoryPolicyInternal(
  source: FederalOperationSource,
  federationId: string,
  leagueId: string | null | undefined,
  seasonId: string | null | undefined,
  at: Date = new Date(),
): Promise<ResolvedPolicy<RegulatoryPolicyValues>> {
  const rows = await loadPolicyRows(source, federationId)
  const records = rows.map(toPolicyRecord)
  const context: PolicyContext = {
    federationId,
    leagueId: leagueId ?? null,
    seasonId: seasonId ?? null,
    competitionId: seasonId ?? null,
  }
  return resolvePolicy(REGULATORY_POLICY_DEFAULTS, records, context, at)
}

export async function resolveRegulatoryPolicy(
  source: FederalOperationSource,
  session: SsoUser,
  context: { federationId: string; leagueId?: string | null; seasonId?: string | null },
) {
  assertFederalOperationScope(session, context.federationId, context.leagueId ?? undefined)
  const resolved = await resolveRegulatoryPolicyInternal(source, context.federationId, context.leagueId, context.seasonId)
  const documentRequirements = await source.query(
    `SELECT * FROM regulatory_document_requirements
      WHERE federation_id = ? AND active = 1
        AND (league_id IS NULL OR league_id = ?)
        AND (season_id IS NULL OR season_id = ?)
      ORDER BY domain, code`,
    [context.federationId, context.leagueId ?? null, context.seasonId ?? null],
  )
  return { resolved, documentRequirements }
}

export async function listRegulatoryPolicyRecords(source: FederalOperationSource, session: SsoUser, federationId: string, leagueId?: string | null) {
  assertFederalOperationScope(session, federationId, leagueId ?? undefined)
  const rows = await loadPolicyRows(source, federationId)
  return rows.map((row) => ({
    id: row.id,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    federationId: row.federation_id,
    leagueId: row.league_id,
    version: row.version,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    values: parseValues(row),
    reason: row.reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }))
}

export async function createRegulatoryPolicyRecord(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  input: Record<string, unknown>,
) {
  const federationId = requireString(input.federationId, 'Fédération')
  const leagueId = optionalString(input.leagueId)
  assertFederalOperationScope(session, federationId, leagueId)
  const scopeType = requireEnum(input.scopeType, REGULATORY_POLICY_SCOPE_TYPES, 'Portée de la politique')
  if (scopeType === 'PLATFORM' && !canAccessPlatform(session)) {
    throw new FederalOperationAuthorizationError('Seule la plateforme peut définir une politique de portée PLATFORM')
  }

  let scopeId: string | null = null
  if (scopeType === 'FEDERATION') scopeId = federationId
  else if (scopeType === 'LEAGUE') scopeId = requireString(leagueId ?? (input.scopeId as string | undefined), 'Ligue')
  else if (scopeType === 'SEASON') scopeId = requireString(input.scopeId, 'Saison / compétition')

  const reason = requireConfigurationChangeReason(requireString(input.reason, 'Motif du changement', 1000))
  const values = sanitizeRegulatoryPolicyValues(input.values)

  const id = newFederalOperationId()
  const effectiveFrom = input.effectiveFrom ? new Date(String(input.effectiveFrom)) : new Date()
  if (Number.isNaN(effectiveFrom.getTime())) throw new FederalOperationInputError("Date d'entrée en vigueur invalide")
  const effectiveUntil = input.effectiveUntil ? new Date(String(input.effectiveUntil)) : null
  if (effectiveUntil && Number.isNaN(effectiveUntil.getTime())) throw new FederalOperationInputError('Date de fin de validité invalide')

  const created = await source.transaction(async (manager) => {
    const versionRows = await manager.query(
      `SELECT COALESCE(MAX(version), 0) AS v FROM federal_regulatory_policies WHERE scope_type = ? AND (scope_id <=> ?)`,
      [scopeType, scopeId],
    ) as Array<{ v: number | string }>
    const version = Number(versionRows[0]?.v ?? 0) + 1
    await manager.query(
      `INSERT INTO federal_regulatory_policies
        (id, scope_type, scope_id, federation_id, league_id, version, effective_from, effective_until, values_json, reason, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, scopeType, scopeId, federationId, leagueId, version, effectiveFrom, effectiveUntil, JSON.stringify(values), reason, audit.userId],
    )
    await recordFederalOperationAudit(manager, audit, 'REGULATORY_POLICY', id, 'CREATED', null, { scopeType, scopeId, version, values }, reason)
    return { id, scopeType, scopeId, version, values, effectiveFrom, effectiveUntil }
  })
  return created
}

/** FED-004 : garde serveur — lève si un LEAGUE_ADMIN tente une opération que sa fédération ne lui a pas déléguée. */
export async function assertOperationDelegated(
  source: FederalOperationSource,
  session: SsoUser,
  federationId: string,
  leagueId: string | null | undefined,
  operationKey: DelegatableOperation,
): Promise<void> {
  if (session.role !== 'LEAGUE_ADMIN' || !leagueId) return
  const { values } = await resolveRegulatoryPolicyInternal(source, federationId, leagueId, null)
  assertOperationDelegatedPure(session.role, leagueId, values.delegatedOperations, operationKey)
}

/** FED-005 : garde serveur — lève si la policy exige une décision de commission signée et qu'aucune n'existe pour ce dossier. */
export async function assertCommissionDecisionRequired(
  source: FederalOperationSource,
  federationId: string,
  leagueId: string | null | undefined,
  flag: 'commissionRequiredForDiscipline' | 'commissionRequiredForAppeals' | 'commissionRequiredForClubLicensing',
  sourceType: 'DISCIPLINARY_CASE' | 'APPEAL' | 'CLUB_LICENSE',
  sourceId: string,
  label: string,
): Promise<void> {
  const { values } = await resolveRegulatoryPolicyInternal(source, federationId, leagueId, null)
  if (!values[flag]) return
  const rows = await source.query(
    `SELECT 1 FROM federal_commission_decisions WHERE source_type = ? AND source_id = ? AND signed_at IS NOT NULL LIMIT 1`,
    [sourceType, sourceId],
  ) as unknown[]
  assertCommissionDecisionRequiredPure(true, rows.length > 0, label)
}
