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
