import { NextRequest, NextResponse } from 'next/server'
import { ensureServiceAuth } from '@/lib/serviceAuth'
import { RoleService } from '@/services/RoleService'
import type { ClubRbacAccessResult } from '../../../../../../packages/domain-contracts/src/club-access'

export async function GET(request: NextRequest) {
  const authError = ensureServiceAuth(request)
  if (authError) return authError

  const teamId = request.nextUrl.searchParams.get('teamId')?.trim()
  const userId = request.nextUrl.searchParams.get('userId')?.trim()
  if (!teamId || !userId) {
    return NextResponse.json({ error: 'teamId and userId are required' }, { status: 400 })
  }

  const access = await new RoleService().getEffectiveAccess(teamId, userId)
  const result: ClubRbacAccessResult = {
    permissions: access.permissions,
    categories: access.categories,
  }
  return NextResponse.json(result)
}
