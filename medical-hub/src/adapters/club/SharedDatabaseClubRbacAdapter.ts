import { getDataSource } from '@/lib/database'
import {
  resolveClubRbacProjection,
  type ClubDelegationSnapshot,
  type ClubRbacAccessRequest,
  type ClubRbacAccessResult,
  type ClubRbacIdentitySnapshot,
  type ClubRbacReadPort,
  type ClubRoleGrantSnapshot,
} from '../../../../packages/domain-contracts/src/club-access'

interface DirectRoleRow {
  userId: string
  permissions: string
  isGlobal: number | boolean
  category: string | null
  validFrom: Date | string | null
  validUntil: Date | string | null
  revokedAt: Date | string | null
}

interface DelegationRow {
  delegatorUserId: string
  delegateeUserId: string
  permissions: string
  category: string | null
  validFrom: Date | string
  validUntil: Date | string
  revokedAt: Date | string | null
}

interface IdentityRow {
  userId: string
  isActive: number | boolean
  role: string
}

function parsePermissions(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((permission): permission is string => typeof permission === 'string')
      : []
  } catch {
    return []
  }
}

function requiredDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

function optionalDate(value: Date | string | null): Date | null {
  return value === null ? null : requiredDate(value)
}

/**
 * Transitional shared-db adapter. CLUB-012 requires parity with Club Hub:
 * direct grants are temporal/revocable and delegated rights remain terminal,
 * including immediate loss when the delegator's direct authority disappears.
 */
export class SharedDatabaseClubRbacAdapter implements ClubRbacReadPort {
  async getEffectiveAccess(input: ClubRbacAccessRequest): Promise<ClubRbacAccessResult> {
    const dataSource = await getDataSource()
    const delegations = (await dataSource.query(
      `SELECT delegator_user_id AS delegatorUserId,
              delegatee_user_id AS delegateeUserId,
              permissions,
              category,
              valid_from AS validFrom,
              valid_until AS validUntil,
              revoked_at AS revokedAt
       FROM cms_role_delegations
       WHERE team_id = ? AND delegatee_user_id = ?`,
      [input.teamId, input.userId],
    )) as DelegationRow[]

    const userIds = Array.from(new Set([input.userId, ...delegations.map((row) => row.delegatorUserId)]))
    const placeholders = userIds.map(() => '?').join(', ')
    const directRows = (await dataSource.query(
      `SELECT ur.user_id AS userId,
              r.permissions,
              r.is_global AS isGlobal,
              ur.category,
              ur.valid_from AS validFrom,
              ur.valid_until AS validUntil,
              ur.revoked_at AS revokedAt
       FROM cms_user_roles ur
       INNER JOIN cms_roles r ON r.id = ur.role_id AND r.team_id = ur.team_id
       WHERE ur.team_id = ? AND ur.user_id IN (${placeholders})`,
      [input.teamId, ...userIds],
    )) as DirectRoleRow[]
    const identityRows = (await dataSource.query(
      `SELECT id AS userId, isActive, role
       FROM \`User\`
       WHERE teamId = ? AND id IN (${placeholders})`,
      [input.teamId, ...userIds],
    )) as IdentityRow[]

    const directGrants: ClubRoleGrantSnapshot[] = directRows.map((row) => ({
      userId: row.userId,
      permissions: parsePermissions(row.permissions),
      isGlobal: Boolean(row.isGlobal),
      category: row.category,
      validFrom: optionalDate(row.validFrom),
      validUntil: optionalDate(row.validUntil),
      revokedAt: optionalDate(row.revokedAt),
    }))
    const delegationGrants: ClubDelegationSnapshot[] = delegations.map((row) => ({
      delegatorUserId: row.delegatorUserId,
      delegateeUserId: row.delegateeUserId,
      permissions: parsePermissions(row.permissions),
      category: row.category,
      validFrom: requiredDate(row.validFrom),
      validUntil: requiredDate(row.validUntil),
      revokedAt: optionalDate(row.revokedAt),
    }))
    const identities: ClubRbacIdentitySnapshot[] = identityRows.map((row) => ({
      userId: row.userId,
      isActive: Boolean(row.isActive),
      isClubAdmin: row.role === 'ADMIN' || row.role === 'CLUB_ADMIN',
    }))

    return resolveClubRbacProjection({
      userId: input.userId,
      directGrants,
      delegations: delegationGrants,
      identities,
    })
  }
}