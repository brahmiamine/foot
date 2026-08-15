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
  return access.permissions.includes(permission)
}

export function toClientAccess(access: ServerAccessLike): ClientAccess {
  return {
    isClubAdmin: access.isClubAdmin,
    permissions: access.permissions === 'ALL' ? 'ALL' : Array.from(access.permissions),
  }
}
