import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminOrFederationAuth } from '@/lib/adminAuth'
import { listOfficialAccounts } from '@/lib/clubAccounts'

export const runtime = 'nodejs'

/**
 * GET /api/admin/officials — comptes SSO REFEREE/MATCH_OFFICIAL/
 * REFEREE_OBSERVER (migration.md §0/§11), utilisé par l'écran d'affectation
 * d'officiels de match (Phase 4) pour peupler le sélecteur `user_id`. Ces
 * comptes n'ont pas de scope fédéral propre (Phase 4) : lecture ouverte à
 * tout FEDERATION_ADMIN, pas de filtre supplémentaire à appliquer.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminOrFederationAuth(request)
  if (unauthorized) return unauthorized

  try {
    const officials = await listOfficialAccounts()
    return NextResponse.json(officials)
  } catch (error) {
    console.error('Error fetching official accounts:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
