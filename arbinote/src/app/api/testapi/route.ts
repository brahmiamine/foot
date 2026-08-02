import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { enforcePublicRateLimit } from '@/lib/publicRateLimit'
import {
  callApiFootballCached,
  getTunisiaFixtureDetail,
  TUNISIA_LEAGUE_ID,
  TUNISIA_LATEST_SEASON,
} from '@/lib/apiFootball'

export const runtime = 'nodejs'

const LIVE_TTL_MS = 30 * 1000
const SEASON_TTL_MS = 6 * 60 * 60 * 1000

export async function GET(request: NextRequest) {
  const limited = enforcePublicRateLimit(request, 'testapi-public', { windowMs: 60_000, max: 30 })
  if (limited) return limited

  const action = new URL(request.url).searchParams.get('action') ?? 'live'

  try {
    if (action === 'live') {
      const result = await callApiFootballCached('fixtures', { live: 'all' }, LIVE_TTL_MS)
      const response = result.body as { response?: Array<{ league?: { id?: number } }> } | null
      const all = response?.response ?? []
      const tunisia = all.filter((f) => f.league?.id === TUNISIA_LEAGUE_ID)

      // En dehors d'un match tunisien réellement en cours (plan Free = pas
      // de saison courante pour la Tunisie), on retombe sur les matchs en
      // direct du monde entier : ça permet de voir l'onglet "En direct" et
      // le détail d'un match fonctionner avec de vraies données live, même
      // sans match Ligue 1 Tunisie disponible au moment de la visite.
      const fixtures = tunisia.length > 0 ? tunisia : all
      const scope = tunisia.length > 0 ? 'tunisia' : 'world'

      return NextResponse.json({ ok: result.ok, scope, fixtures })
    }

    if (action === 'season') {
      const result = await callApiFootballCached(
        'fixtures',
        { league: String(TUNISIA_LEAGUE_ID), season: String(TUNISIA_LATEST_SEASON) },
        SEASON_TTL_MS
      )
      const response = result.body as { response?: unknown[] } | null
      return NextResponse.json({ ok: result.ok, season: TUNISIA_LATEST_SEASON, fixtures: response?.response ?? [] })
    }

    if (action === 'standings') {
      const result = await callApiFootballCached(
        'standings',
        { league: String(TUNISIA_LEAGUE_ID), season: String(TUNISIA_LATEST_SEASON) },
        SEASON_TTL_MS
      )
      const response = result.body as { response?: Array<{ league?: { standings?: unknown[][] } }> } | null
      const standings = response?.response?.[0]?.league?.standings?.[0] ?? []
      return NextResponse.json({ ok: result.ok, season: TUNISIA_LATEST_SEASON, standings })
    }

    if (action === 'fixture') {
      const id = new URL(request.url).searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

      const detail = await getTunisiaFixtureDetail(id)
      if (!detail) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })

      return NextResponse.json({ ok: true, ...detail })
    }

    return NextResponse.json({ error: 'action invalide' }, { status: 400 })
  } catch (error) {
    console.error('testapi public error:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}
