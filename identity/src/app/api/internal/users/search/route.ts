import { NextRequest, NextResponse } from 'next/server'
import { ensureServiceAuth } from '@/lib/serviceAuth'
import { listUsers } from '@/lib/identityService'
import {
  IDENTITY_ROLES,
  type IdentityRole,
} from '../../../../../../../packages/domain-contracts/src/identity'

export const runtime = 'nodejs'

const allowedRoles = new Set<string>(IDENTITY_ROLES)

export async function GET(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request)
  if (unauthorized) return unauthorized

  const teamId = request.nextUrl.searchParams.get('teamId')?.trim() || undefined
  const rolesParam = request.nextUrl.searchParams.get('roles')
  const roles = rolesParam
    ? rolesParam.split(',').map((role) => role.trim()).filter(Boolean)
    : []
  if (roles.some((role) => !allowedRoles.has(role))) {
    return NextResponse.json({ error: 'role invalide' }, { status: 400 })
  }

  const hasTeamParam = request.nextUrl.searchParams.get('hasTeam')
  if (hasTeamParam !== null && hasTeamParam !== 'true' && hasTeamParam !== 'false') {
    return NextResponse.json({ error: 'hasTeam doit être true ou false' }, { status: 400 })
  }

  const users = await listUsers({
    teamId,
    roles: roles as IdentityRole[],
    hasTeam: hasTeamParam === null ? undefined : hasTeamParam === 'true',
  })
  return NextResponse.json({ users })
}
