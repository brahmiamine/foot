import { randomUUID } from 'node:crypto'
import type { DataSource, EntityManager } from 'typeorm'
import type { SsoUser } from './ssoSession'
import { canAccessFederation, canAccessLeague, canAccessPlatform } from '../../../packages/auth-shared/src/roles'

export type FederalOperationSource = DataSource | EntityManager

export interface FederalOperationAuditContext {
  userId: string
  role: string
  ipAddress?: string | null
  userAgent?: string | null
}

export class FederalOperationAuthorizationError extends Error {
  constructor(message = 'Accès réglementaire refusé') {
    super(message)
    this.name = 'FederalOperationAuthorizationError'
  }
}

export const newFederalOperationId = () => randomUUID()

export function assertFederalOperationScope(session: SsoUser, federationId: string, leagueId?: string | null): void {
  if (canAccessPlatform(session)) return
  if (leagueId && canAccessLeague(session, leagueId, federationId)) return
  if (canAccessFederation(session, federationId)) return
  throw new FederalOperationAuthorizationError()
}

export function buildFederalOperationScopeFilter(session: SsoUser, alias = ''): { sql: string; params: unknown[] } {
  const prefix = alias ? `${alias}.` : ''
  if (canAccessPlatform(session)) return { sql: '1 = 1', params: [] }
  if (session.role === 'FEDERATION_ADMIN' && session.federationId) {
    return { sql: `${prefix}federation_id = ?`, params: [session.federationId] }
  }
  if (session.role === 'LEAGUE_ADMIN' && session.leagueId) {
    return { sql: `${prefix}league_id = ?`, params: [session.leagueId] }
  }
  return { sql: '1 = 0', params: [] }
}

export async function recordFederalOperationAudit(
  source: FederalOperationSource,
  context: FederalOperationAuditContext,
  domain: string,
  entityId: string,
  action: string,
  beforeValue: unknown,
  afterValue: unknown,
  reason?: string | null,
): Promise<void> {
  await source.query(
    `INSERT INTO federal_operation_audit
      (id, domain, entity_id, action, actor_user_id, actor_role, reason, before_value, after_value, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      domain,
      entityId,
      action,
      context.userId,
      context.role,
      reason ?? null,
      beforeValue == null ? null : JSON.stringify(beforeValue),
      afterValue == null ? null : JSON.stringify(afterValue),
      context.ipAddress ?? null,
      context.userAgent ?? null,
    ],
  )
}

export function requireString(value: unknown, label: string, maxLength = 191): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} requis`)
  const normalized = value.trim()
  if (normalized.length > maxLength) throw new Error(`${label} trop long`)
  return normalized
}

export function optionalString(value: unknown, maxLength = 191): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') throw new Error('Valeur texte invalide')
  const normalized = value.trim()
  if (normalized.length > maxLength) throw new Error('Valeur texte trop longue')
  return normalized || null
}

export function requireEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new Error(`${label} invalide`)
  return value as T
}

export function requireAmount(value: unknown, label: string): number {
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`${label} invalide`)
  return amount
}

export async function loadScopedRow<T extends { federation_id: string; league_id?: string | null }>(
  source: FederalOperationSource,
  session: SsoUser,
  table: string,
  id: string,
): Promise<T> {
  if (!/^[a-z_]+$/.test(table)) throw new Error('Table réglementaire invalide')
  const rows = await source.query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]) as T[]
  const row = rows[0]
  if (!row) throw new Error('Ressource réglementaire introuvable')
  assertFederalOperationScope(session, row.federation_id, row.league_id ?? null)
  return row
}
