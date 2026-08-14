import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminOrFederationAuth, canAccessPlatform, getAdminSession } from '@/lib/adminAuth'
import { listPlayersGlobal } from '@/lib/players'

export const runtime = 'nodejs'

/**
 * GET /api/admin/players — vue globale des joueurs (migration.md §18).
 * Filtres fédération/ligue/saison/club/catégorie/poste/statut/recherche.
 * Pour un `FEDERATION_ADMIN`, `federation_id` est TOUJOURS forcé à sa
 * propre fédération (`session.federationId`), jamais la valeur fournie par
 * le client (migration.md §3) — un `league_id`/`saison_id` d'une autre
 * fédération, combiné à ce filtre forcé, ne peut renvoyer aucun résultat.
 *
 * Pagination : `page` commence à 1, `page_size` est borné côté service à
 * 100. La réponse contient `items`, `total` et `totalPages`.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminOrFederationAuth(request)
  if (unauthorized) return unauthorized

  try {
    const session = await getAdminSession(request)
    const { searchParams } = new URL(request.url)

    const federationId =
      session && !canAccessPlatform(session) ? session.federationId : searchParams.get('federation_id') || null

    const parsedPage = Number.parseInt(searchParams.get('page') || '1', 10)
    const parsedPageSize = Number.parseInt(searchParams.get('page_size') || '50', 10)

    const result = await listPlayersGlobal(
      {
        federationId,
        leagueId: searchParams.get('league_id') || null,
        saisonId: searchParams.get('saison_id') || null,
        teamId: searchParams.get('team_id') || null,
        category: searchParams.get('category') || null,
        position: searchParams.get('position') || null,
        status: searchParams.get('status') || null,
        search: searchParams.get('q') || null,
      },
      Number.isFinite(parsedPage) ? parsedPage : 1,
      Number.isFinite(parsedPageSize) ? parsedPageSize : 50,
    )
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error listing players:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
