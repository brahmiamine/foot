import type { Metadata } from 'next'
import {
  callApiFootballCached,
  TUNISIA_LEAGUE_ID,
  TUNISIA_LATEST_SEASON,
  type ApiFootballResult,
} from '@/lib/apiFootball'
import TunisiaFootballClient, { type Fixture, type StandingRow } from '@/components/TunisiaFootballClient'

export const metadata: Metadata = {
  title: 'Ligue 1 Tunisie — Suivi des matchs | ARBINOTE',
  description: 'Calendrier, résultats et classement de la Ligue 1 Tunisie (données API-Football).',
}

const SEASON_TTL_MS = 6 * 60 * 60 * 1000

async function loadInitialData(): Promise<{
  fixtures: Fixture[]
  standings: StandingRow[]
  error: string | null
}> {
  try {
    const [fixturesResult, standingsResult] = await Promise.all([
      callApiFootballCached(
        'fixtures',
        { league: String(TUNISIA_LEAGUE_ID), season: String(TUNISIA_LATEST_SEASON) },
        SEASON_TTL_MS
      ),
      callApiFootballCached(
        'standings',
        { league: String(TUNISIA_LEAGUE_ID), season: String(TUNISIA_LATEST_SEASON) },
        SEASON_TTL_MS
      ),
    ])

    if (!fixturesResult.ok) {
      return { fixtures: [], standings: [], error: describeError(fixturesResult) }
    }

    const fixturesBody = fixturesResult.body as { response?: Fixture[] } | null
    const standingsBody = standingsResult.body as {
      response?: Array<{ league?: { standings?: StandingRow[][] } }>
    } | null

    return {
      fixtures: fixturesBody?.response ?? [],
      standings: standingsBody?.response?.[0]?.league?.standings?.[0] ?? [],
      error: null,
    }
  } catch {
    return { fixtures: [], standings: [], error: "La clé API-Football n'est pas configurée (API_FOOTBALL_KEY)." }
  }
}

function describeError(result: ApiFootballResult): string {
  const body = result.body as { errors?: unknown } | null
  if (body?.errors && typeof body.errors === 'object') {
    const messages = Object.values(body.errors as Record<string, string>)
    if (messages.length > 0) return messages.join(' ')
  }
  return `Erreur API-Football (HTTP ${result.status})`
}

export default async function TestApiPage() {
  const { fixtures, standings, error } = await loadInitialData()

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-10 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Ligue 1 Tunisie — Suivi des matchs
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Données fournies par API-Football (v3.football.api-sports.io).
        </p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-4">{error}</div>
      ) : (
        <TunisiaFootballClient initialFixtures={fixtures} initialStandings={standings} season={TUNISIA_LATEST_SEASON} />
      )}
    </div>
  )
}
