import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { listClubsWithAccountCounts, createClubUser } from '@/lib/clubAccounts'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * GET /api/admin/club
 * Liste des clubs avec le nombre de comptes de connexion de chacun.
 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const clubs = await listClubsWithAccountCounts()
    return NextResponse.json(clubs)
  } catch (error) {
    console.error('Error fetching clubs:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/admin/club
 * Crée un nouveau compte de connexion pour un club.
 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const user = await createClubUser(body)
    await logAdminAction({ request, action: 'create', entityType: 'club_user', entityId: user.id, summary: user.email })
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating club user:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}
