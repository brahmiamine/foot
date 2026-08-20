export interface ClubRbacAccessRequest {
  teamId: string
  userId: string
}

export interface ClubRbacAccessResult {
  permissions: string[]
  categories: 'ALL' | string[]
}

/**
 * Read boundary owned by the Club domain for cms_roles/cms_user_roles.
 * Specialized hubs consume effective access without knowing the RBAC schema.
 */
export interface ClubRbacReadPort {
  getEffectiveAccess(input: ClubRbacAccessRequest): Promise<ClubRbacAccessResult>
}

export type ClubPermissionScope = 'ALL' | string[] | null

export interface ClubPermissionScopeRequest extends ClubRbacAccessRequest {
  permission: string
}

/**
 * Permission-specific read boundary. It preserves category semantics when a
 * user owns several Club Hub roles: a global permission grants ALL, otherwise
 * only categories carried by roles that actually contain this permission are
 * returned.
 */
export interface ClubPermissionScopeReadPort {
  getPermissionScope(input: ClubPermissionScopeRequest): Promise<ClubPermissionScope>
}

export interface ClubRoleGrantSnapshot {
  userId: string
  permissions: string[]
  isGlobal: boolean
  category: string | null
  validFrom: Date | null
  validUntil: Date | null
  revokedAt: Date | null
}

export interface ClubDelegationSnapshot {
  delegatorUserId: string
  delegateeUserId: string
  permissions: string[]
  category: string | null
  validFrom: Date
  validUntil: Date
  revokedAt: Date | null
}

export interface ClubRbacIdentitySnapshot {
  userId: string
  isActive: boolean
  isClubAdmin: boolean
}

export interface ClubRbacProjectionSnapshot {
  userId: string
  directGrants: readonly ClubRoleGrantSnapshot[]
  delegations: readonly ClubDelegationSnapshot[]
  identities: readonly ClubRbacIdentitySnapshot[]
  at?: Date
}

function dateMs(value: Date | null): number | null {
  if (!value) return null
  const time = value.getTime()
  return Number.isFinite(time) ? time : null
}

export function isClubRbacWindowActive(
  window: { validFrom: Date | null; validUntil: Date | null; revokedAt: Date | null },
  at: Date = new Date(),
): boolean {
  const atMs = at.getTime()
  if (!Number.isFinite(atMs)) return false
  const revokedAt = dateMs(window.revokedAt)
  const validFrom = dateMs(window.validFrom)
  const validUntil = dateMs(window.validUntil)
  if (window.revokedAt && revokedAt === null) return false
  if (window.validFrom && validFrom === null) return false
  if (window.validUntil && validUntil === null) return false
  if (revokedAt !== null && revokedAt <= atMs) return false
  if (validFrom !== null && validFrom > atMs) return false
  if (validUntil !== null && validUntil <= atMs) return false
  return true
}

interface DirectAuthority {
  permissions: Set<string>
  canGlobalScope: boolean
  allowsAllPermissions: boolean
}

function identityMap(identities: readonly ClubRbacIdentitySnapshot[]): Map<string, ClubRbacIdentitySnapshot> {
  return new Map(identities.map((identity) => [identity.userId, identity]))
}

function resolveDirectAuthority(
  userId: string,
  category: string | null,
  directGrants: readonly ClubRoleGrantSnapshot[],
  identities: Map<string, ClubRbacIdentitySnapshot>,
  at: Date,
): DirectAuthority {
  const identity = identities.get(userId)
  if (!identity?.isActive) {
    return { permissions: new Set(), canGlobalScope: false, allowsAllPermissions: false }
  }
  if (identity.isClubAdmin) {
    return { permissions: new Set(), canGlobalScope: true, allowsAllPermissions: true }
  }

  const permissions = new Set<string>()
  let canGlobalScope = false
  for (const grant of directGrants) {
    if (grant.userId !== userId) continue
    if (!isClubRbacWindowActive(grant, at)) continue
    if (grant.isGlobal) {
      canGlobalScope = true
      grant.permissions.forEach((permission) => permissions.add(permission))
    } else if (category !== null && grant.category === category) {
      grant.permissions.forEach((permission) => permissions.add(permission))
    }
  }
  return { permissions, canGlobalScope, allowsAllPermissions: false }
}

function authorityHasPermission(authority: DirectAuthority, permission: string): boolean {
  return authority.allowsAllPermissions || authority.permissions.has(permission)
}

export function resolveClubRbacProjection(snapshot: ClubRbacProjectionSnapshot): ClubRbacAccessResult {
  const at = snapshot.at ?? new Date()
  const identities = identityMap(snapshot.identities)
  const targetIdentity = identities.get(snapshot.userId)
  if (!targetIdentity?.isActive) return { permissions: [], categories: [] }

  const permissions = new Set<string>()
  const categories = new Set<string>()
  let allCategories = false

  for (const grant of snapshot.directGrants) {
    if (grant.userId !== snapshot.userId) continue
    if (!isClubRbacWindowActive(grant, at)) continue
    grant.permissions.forEach((permission) => permissions.add(permission))
    if (grant.isGlobal) allCategories = true
    else if (grant.category) categories.add(grant.category)
  }

  for (const delegation of snapshot.delegations) {
    if (delegation.delegateeUserId !== snapshot.userId) continue
    if (!isClubRbacWindowActive(delegation, at)) continue
    const sourceAuthority = resolveDirectAuthority(
      delegation.delegatorUserId,
      delegation.category,
      snapshot.directGrants,
      identities,
      at,
    )
    const effectivePermissions = delegation.permissions.filter((permission) =>
      authorityHasPermission(sourceAuthority, permission),
    )
    if (effectivePermissions.length === 0) continue
    effectivePermissions.forEach((permission) => permissions.add(permission))
    if (delegation.category === null && sourceAuthority.canGlobalScope) allCategories = true
    else if (delegation.category) categories.add(delegation.category)
  }

  return {
    permissions: Array.from(permissions),
    categories: allCategories ? 'ALL' : Array.from(categories),
  }
}

export function resolveClubPermissionScopeProjection(
  snapshot: ClubRbacProjectionSnapshot,
  permission: string,
): ClubPermissionScope {
  const at = snapshot.at ?? new Date()
  const identities = identityMap(snapshot.identities)
  const targetIdentity = identities.get(snapshot.userId)
  if (!targetIdentity?.isActive) return null

  const categories = new Set<string>()
  let matched = false

  for (const grant of snapshot.directGrants) {
    if (grant.userId !== snapshot.userId) continue
    if (!isClubRbacWindowActive(grant, at)) continue
    if (!grant.permissions.includes(permission)) continue
    matched = true
    if (grant.isGlobal) return 'ALL'
    if (grant.category) categories.add(grant.category)
  }

  for (const delegation of snapshot.delegations) {
    if (delegation.delegateeUserId !== snapshot.userId) continue
    if (!isClubRbacWindowActive(delegation, at)) continue
    if (!delegation.permissions.includes(permission)) continue
    const sourceAuthority = resolveDirectAuthority(
      delegation.delegatorUserId,
      delegation.category,
      snapshot.directGrants,
      identities,
      at,
    )
    if (!authorityHasPermission(sourceAuthority, permission)) continue
    matched = true
    if (delegation.category === null && sourceAuthority.canGlobalScope) return 'ALL'
    if (delegation.category) categories.add(delegation.category)
  }

  return matched ? Array.from(categories) : null
}