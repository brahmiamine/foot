export interface ClientAccess {
  isClubAdmin: boolean
  permissions: 'ALL' | string[]
}

export interface ServerAccessLike {
  isClubAdmin: boolean
  permissions: 'ALL' | Set<string>
}

export function canClient(access: ClientAccess, permission?: string): boolean {
  if (!permission) return true
  if (access.isClubAdmin || access.permissions === 'ALL') return true
  if (access.permissions.includes(permission)) return true
  // CLUB-013 compatibility bridge: medical.manage historically represented
  // full medical write access. Keep that meaning for existing custom roles
  // while new presets use the granular permissions.
  return permission.startsWith('medical.') && access.permissions.includes('medical.manage')
}

export function toClientAccess(access: ServerAccessLike): ClientAccess {
  return {
    isClubAdmin: access.isClubAdmin,
    permissions: access.permissions === 'ALL' ? 'ALL' : Array.from(access.permissions),
  }
}
