import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { safeErrorMessage } from '@/lib/apiError'
import {
  searchApiFootballFixturesByDate,
  searchApiFootballLiveFixtures,
  searchApiFootballTeams,
} from '@/lib/apiFootball'

export const runtime = 'nodejs'

/**
 * Recherche assistée API-Football pour l'écran de mapping
 * (/admin/api-football) : trouve un id d'équipe ou de fixture à proposer à
 * l'opérateur, qui choisit toujours manuellement (jamais de rapprochement
 * automatique — voir superadmin/matching.md). Séparé de /api/admin/testapi
 * (proxy générique de debug, params libres) : cette route ne whiteliste que
 * les paramètres réellement utiles au mapping.
 *
 * Si API_FOOTBALL_KEY est absent, callApiFootball lève une erreur — captée
 * ici comme n'importe quelle autre erreur amont, jamais un crash de route.
 * L'écran de mapping reste utilisable dans ce cas via la saisie manuelle
 * de l'id (ce que cette route ne conditionne pas).
 */
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  try {
    if (type === 'teams') {
      const query = (searchParams.get('query') ?? '').trim()
      if (query.length < 3) {
        return NextResponse.json(
          { error: 'Recherche trop courte (3 caractères minimum, contrainte API-Football).' },
          { status: 400 }
        )
      }
      return NextResponse.json({ results: await searchApiFootballTeams(query) })
    }

    if (type === 'fixtures') {
      if (searchParams.get('live') === 'all') {
        return NextResponse.json({ results: await searchApiFootballLiveFixtures() })
      }

      const date = searchParams.get('date') ?? ''
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { error: 'Paramètre date invalide (format attendu YYYY-MM-DD).' },
          { status: 400 }
        )
      }
      return NextResponse.json({ results: await searchApiFootballFixturesByDate(date) })
    }

    return NextResponse.json(
      { error: "Paramètre type invalide (attendu 'teams' ou 'fixtures')." },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error searching API-Football for mapping:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}
