import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getClubById, listUsersForTeam } from '@/lib/clubAccounts'

export const runtime = 'nodejs'

/**
 * GET /api/admin/club/[teamId]
 * Infos du club + liste de ses comptes de connexion.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { teamId } = await params
    const club = await getClubById(teamId)
    if (!club) {
      return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })
    }
    const users = await listUsersForTeam(teamId)
    return NextResponse.json({ club, users })
  } catch (error) {
    console.error('Error fetching club users:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}
