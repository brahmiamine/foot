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
