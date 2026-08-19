import type { DataSource } from 'typeorm'
import { canAccessPlatform } from '../../../packages/auth-shared/src/roles'
import {
  assertGovernanceExceptionWindow,
  type GovernanceExceptionRecord,
} from '../../../packages/domain-contracts/src/governance-exception'
import { requireConfigurationChangeReason } from '../../../packages/domain-contracts/src/configuration-audit'
import type { SsoUser } from './ssoSession'
import {
  assertFederalOperationScope,
  buildFederalOperationScopeFilter,
  FederalOperationAuthorizationError,
  FederalOperationInputError,
  newFederalOperationId,
  optionalString,
  recordFederalOperationAudit,
  requireEnum,
  requireString,
  type FederalOperationAuditContext,
  type FederalOperationSource,
} from './federalOperationsCommon'

export const GOVERNANCE_EXCEPTION_RULES = [
  'REGULATORY_DOCUMENT_REQUIRED',
] as const
export type GovernanceExceptionRule = (typeof GOVERNANCE_EXCEPTION_RULES)[number]

export interface GovernanceExceptionRow extends GovernanceExceptionRecord {
  federationId: string
  leagueId: string | null
  createdBy: string
  createdAt: Date | string
  revokedBy: string | null
  revokeReason: string | null
}

export interface GovernanceExceptionInput {
  federationId: unknown
  leagueId?: unknown
  ruleKey: unknown
  targetType: unknown
  targetId: unknown
  reference: unknown
  reason: unknown
  validFrom?: unknown
  validUntil: unknown
}

function assertCanManage(session: SsoUser): void {
  if (canAccessPlatform(session) || session.role === 'FEDERATION_ADMIN') return
  throw new FederalOperationAuthorizationError('Seule la plateforme ou la fédération peut créer/révoquer une dérogation')
}

function parseDate(value: unknown, label: string, fallback?: Date): Date {
  if ((value == null || value === '') && fallback) return fallback
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) throw new FederalOperationInputError(`${label} invalide`)
  return date
}

function mapRow(row: Record<string, unknown>): GovernanceExceptionRow {
  return {
    id: String(row.id),
    federationId: String(row.federation_id),
    leagueId: row.league_id == null ? null : String(row.league_id),
    ruleKey: String(row.rule_key),
    targetType: String(row.target_type),
    targetId: String(row.target_id),
    reference: String(row.reference_key),
    reason: String(row.reason),
    validFrom: row.valid_from as Date | string,
    validUntil: row.valid_until as Date | string,
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date | string,
    revokedAt: row.revoked_at as Date | string | null,
    revokedBy: row.revoked_by == null ? null : String(row.revoked_by),
    revokeReason: row.revoke_reason == null ? null : String(row.revoke_reason),
  }
}

export async function createGovernanceException(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  input: GovernanceExceptionInput,
): Promise<GovernanceExceptionRow> {
  assertCanManage(session)
  const federationId = requireString(input.federationId, 'Fédération')
  const leagueId = optionalString(input.leagueId)
  assertFederalOperationScope(session, federationId, leagueId)
  const ruleKey = requireEnum(input.ruleKey, GOVERNANCE_EXCEPTION_RULES, 'Règle de dérogation')
  const targetType = requireString(input.targetType, 'Type de cible', 100).toUpperCase()
  const targetId = requireString(input.targetId, 'Cible')
  const reference = requireString(input.reference, 'Référence')
  const reason = requireConfigurationChangeReason(requireString(input.reason, 'Motif', 2000))
  const validFrom = parseDate(input.validFrom, 'Début de validité', new Date())
  const validUntil = parseDate(input.validUntil, 'Fin de validité')
  try {
    assertGovernanceExceptionWindow(validFrom, validUntil)
  } catch {
    throw new FederalOperationInputError('La fin de validité doit être postérieure au début')
  }
  const id = newFederalOperationId()

  await source.transaction(async manager => {
    const overlapping = await manager.query(
      `SELECT id FROM governance_exceptions
        WHERE federation_id = ?
          AND (league_id <=> ?)
          AND rule_key = ? AND target_type = ? AND target_id = ? AND reference_key = ?
          AND revoked_at IS NULL
          AND valid_from < ? AND valid_until > ?
        LIMIT 1`,
      [federationId, leagueId, ruleKey, targetType, targetId, reference, validUntil, validFrom],
    ) as unknown[]
    if (overlapping.length) {
      throw new FederalOperationInputError('Une dérogation active ou planifiée couvre déjà cette règle et cette cible')
    }
    await manager.query(
      `INSERT INTO governance_exceptions
        (id, federation_id, league_id, rule_key, target_type, target_id, reference_key, reason, valid_from, valid_until, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, federationId, leagueId, ruleKey, targetType, targetId, reference, reason, validFrom, validUntil, audit.userId],
    )
    await recordFederalOperationAudit(
      manager,
      audit,
      'GOVERNANCE_EXCEPTION',
      id,
      'CREATED',
      null,
      { federationId, leagueId, ruleKey, targetType, targetId, reference, validFrom, validUntil },
      reason,
    )
  })

  return {
    id,
    federationId,
    leagueId,
    ruleKey,
    targetType,
    targetId,
    reference,
    reason,
    validFrom,
    validUntil,
    createdBy: audit.userId,
    createdAt: new Date(),
    revokedAt: null,
    revokedBy: null,
    revokeReason: null,
  }
}

export async function listGovernanceExceptions(
  source: FederalOperationSource,
  session: SsoUser,
  federationId?: string | null,
): Promise<GovernanceExceptionRow[]> {
  const scope = buildFederalOperationScopeFilter(session, 'e')
  const params = [...scope.params]
  let federationClause = ''
  if (federationId) {
    assertFederalOperationScope(session, federationId)
    federationClause = ' AND e.federation_id = ?'
    params.push(federationId)
  }
  const rows = await source.query(
    `SELECT e.* FROM governance_exceptions e
      WHERE ${scope.sql}${federationClause}
      ORDER BY e.created_at DESC`,
    params,
  ) as Array<Record<string, unknown>>
  return rows.map(mapRow)
}

export async function revokeGovernanceException(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  id: string,
  reasonValue: unknown,
): Promise<GovernanceExceptionRow> {
  assertCanManage(session)
  const rows = await source.query(
    'SELECT * FROM governance_exceptions WHERE id = ? LIMIT 1',
    [id],
  ) as Array<Record<string, unknown>>
  const current = rows[0]
  if (!current) throw new FederalOperationInputError('Dérogation introuvable')
  const row = mapRow(current)
  assertFederalOperationScope(session, row.federationId, row.leagueId)
  if (row.revokedAt) throw new FederalOperationInputError('Dérogation déjà révoquée')
  const reason = requireConfigurationChangeReason(requireString(reasonValue, 'Motif de révocation', 2000))
  const revokedAt = new Date()
  await source.transaction(async manager => {
    await manager.query(
      `UPDATE governance_exceptions
          SET revoked_at = ?, revoked_by = ?, revoke_reason = ?
        WHERE id = ? AND revoked_at IS NULL`,
      [revokedAt, audit.userId, reason, id],
    )
    await recordFederalOperationAudit(
      manager,
      audit,
      'GOVERNANCE_EXCEPTION',
      id,
      'REVOKED',
      { revokedAt: null },
      { revokedAt, revokedBy: audit.userId },
      reason,
    )
  })
  return { ...row, revokedAt, revokedBy: audit.userId, revokeReason: reason }
}

export async function findActiveGovernanceException(
  source: FederalOperationSource,
  context: {
    federationId: string
    leagueId?: string | null
    ruleKey: GovernanceExceptionRule
    targetType: string
    targetId: string
    reference: string
    at?: Date
  },
): Promise<GovernanceExceptionRow | null> {
  const at = context.at ?? new Date()
  const rows = await source.query(
    `SELECT * FROM governance_exceptions
      WHERE federation_id = ?
        AND (league_id IS NULL OR league_id = ?)
        AND rule_key = ? AND target_type = ? AND target_id = ? AND reference_key = ?
        AND revoked_at IS NULL
        AND valid_from <= ? AND valid_until > ?
      ORDER BY CASE WHEN league_id IS NULL THEN 1 ELSE 0 END, created_at DESC
      LIMIT 1`,
    [
      context.federationId,
      context.leagueId ?? null,
      context.ruleKey,
      context.targetType.toUpperCase(),
      context.targetId,
      context.reference,
      at,
      at,
    ],
  ) as Array<Record<string, unknown>>
  return rows[0] ? mapRow(rows[0]) : null
}
