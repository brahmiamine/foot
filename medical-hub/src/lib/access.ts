import { createClubRbacAdapter } from '@/adapters/club/createClubRbacAdapter'
import { auth } from './auth'
import type { AgeCategory } from '@/types/categories'

export interface UserAccess {
  userId: string
  teamId: string
  isClubAdmin: boolean
  permissions: 'ALL' | Set<string>
  categories: 'ALL' | AgeCategory[]
}

/**
 * Club owns cms_roles/cms_user_roles. ADMIN still gets full access from the
 * trusted SSO session; non-admin effective RBAC is resolved through the Club
 * domain port rather than reading Club tables in this application service.
 */
export async function getUserAccess(): Promise<UserAccess> {
  const session = await auth()
  if (!session) throw new Error('Non authentifié')

  const { id: userId, teamId, role } = session.user

  if (role === 'ADMIN') {
    return { userId, teamId, isClubAdmin: true, permissions: 'ALL', categories: 'ALL' }
  }

  const resolved = await createClubRbacAdapter().getEffectiveAccess({ teamId, userId })
  return {
    userId,
    teamId,
    isClubAdmin: false,
    permissions: new Set(resolved.permissions),
    categories: resolved.categories === 'ALL' ? 'ALL' : (resolved.categories as AgeCategory[]),
  }
}

export function can(access: UserAccess, permission: string): boolean {
  if (access.permissions === 'ALL') return true
  if (access.permissions.has(permission)) return true
  // CLUB-013 backward compatibility: legacy custom roles with medical.manage
  // retain the historical full medical capability until administrators migrate
  // them to the new least-privilege permissions.
  return permission.startsWith('medical.') && access.permissions.has('medical.manage')
}

export function categoryAllowed(access: UserAccess, category: AgeCategory): boolean {
  if (access.categories === 'ALL') return true
  return access.categories.includes(category)
}

/** Lève une erreur si la permission n'est pas accordée — pour les Server Actions. */
export function requirePermission(access: UserAccess, permission: string): void {
  if (!can(access, permission)) {
    throw new Error('Action non autorisée : permission manquante')
  }
}
