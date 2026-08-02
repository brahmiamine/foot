import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { listSaisonsForAdmin, createSaisonAdmin } from '@/lib/adminSaisons'
import { getActiveLeagueId } from '@/lib/leagueSelection'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const filterByLeague = searchParams.get('filterByActiveLeague') === 'true'
    
    let leagueId: string | null = null
    if (filterByLeague) {
      leagueId = await getActiveLeagueId()
    }
    
    // Lister toutes les saisons (ou filtrer par ligue active si demandé)
    const saisons = await listSaisonsForAdmin(leagueId)
    return NextResponse.json(saisons)
  } catch (error) {
    console.error('Error fetching saisons for admin:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    // Permettre la création de saisons pour n'importe quelle ligue
    const saison = await createSaisonAdmin(body, null)
    await logAdminAction({ request, action: 'create', entityType: 'saison', entityId: saison.id, summary: saison.nom })
    return NextResponse.json(saison)
  } catch (error) {
    console.error('Error creating saison:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

