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

export class FederalOperationInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FederalOperationInputError'
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

export async function assertSeasonInFederalScope(
  source: FederalOperationSource,
  federationId: string,
  leagueId: string | null | undefined,
  seasonId: string,
): Promise<{ id: string; leagueId: string; federationId: string }> {
  const rows = await source.query(
    `SELECT s.id, s.league_id, l.federation_id
       FROM saisons s
       LEFT JOIN ligues l ON l.id = s.league_id
      WHERE s.id = ?
      LIMIT 1`,
    [seasonId],
  ) as Array<{ id: string; league_id: string | null; federation_id: string | null }>
  const row = rows[0]
  if (!row) throw new FederalOperationInputError('Saison introuvable')
  if (!row.league_id || !row.federation_id) {
    throw new FederalOperationInputError('La saison doit être rattachée à une ligue fédérale pour ce processus')
  }
  if (row.federation_id !== federationId || (leagueId && row.league_id !== leagueId)) {
    throw new FederalOperationAuthorizationError('Saison hors périmètre réglementaire')
  }
  return { id: row.id, leagueId: row.league_id, federationId: row.federation_id }
}

export async function assertClubInFederalScope(
  source: FederalOperationSource,
  federationId: string,
  leagueId: string | null | undefined,
  clubId: string,
): Promise<{ federationId: string; leagueId: string | null }> {
  const params: unknown[] = [clubId, federationId]
  let leagueClause = ''
  if (leagueId) {
    leagueClause = ' AND league_id = ?'
    params.push(leagueId)
  }
  const rows = await source.query(
    `SELECT federation_id, league_id
       FROM team_affiliations
      WHERE team_id = ? AND federation_id = ? AND status = 'ACTIVE'${leagueClause}
      ORDER BY start_date DESC, created_at DESC
      LIMIT 1`,
    params,
  ) as Array<{ federation_id: string; league_id: string | null }>
  const row = rows[0]
  if (!row) throw new FederalOperationAuthorizationError('Club hors périmètre réglementaire ou affiliation inactive')
  return { federationId: row.federation_id, leagueId: row.league_id }
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
  if (typeof value !== 'string' || !value.trim()) throw new FederalOperationInputError(`${label} requis`)
  const normalized = value.trim()
  if (normalized.length > maxLength) throw new FederalOperationInputError(`${label} trop long`)
  return normalized
}

export function optionalString(value: unknown, maxLength = 191): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') throw new FederalOperationInputError('Valeur texte invalide')
  const normalized = value.trim()
  if (normalized.length > maxLength) throw new FederalOperationInputError('Valeur texte trop longue')
  return normalized || null
}

export function requireEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new FederalOperationInputError(`${label} invalide`)
  return value as T
}

export function requireAmount(value: unknown, label: string): number {
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount) || amount <= 0) throw new FederalOperationInputError(`${label} invalide`)
  return amount
}

export async function loadScopedRow<T extends { federation_id: string; league_id?: string | null }>(
  source: FederalOperationSource,
  session: SsoUser,
  table: string,
  id: string,
): Promise<T> {
  if (!/^[a-z_]+$/.test(table)) throw new FederalOperationInputError('Table réglementaire invalide')
  const rows = await source.query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]) as T[]
  const row = rows[0]
  if (!row) throw new FederalOperationInputError('Ressource réglementaire introuvable')
  assertFederalOperationScope(session, row.federation_id, row.league_id ?? null)
  return row
}
