import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { listOfficialAccounts } from '@/lib/clubAccounts'

export const runtime = 'nodejs'

/**
 * GET /api/admin/officials — comptes SSO REFEREE/MATCH_OFFICIAL/
 * REFEREE_OBSERVER (migration.md §0/§11), utilisé par l'écran d'affectation
 * d'officiels de match (Phase 4) pour peupler le sélecteur `user_id`.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const officials = await listOfficialAccounts()
    return NextResponse.json(officials)
  } catch (error) {
    console.error('Error fetching official accounts:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
