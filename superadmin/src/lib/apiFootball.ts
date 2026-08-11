import { LIVE_STATUSES } from './footballDisplay'

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io'

/**
 * Liste blanche des endpoints exposés via /api/admin/testapi. Evite qu'un
 * paramètre `endpoint` arbitraire ne serve de proxy ouvert vers n'importe
 * quelle URL et ne consomme le quota (100 req/jour en plan Free) sur des
 * appels non prévus.
 */
export const API_FOOTBALL_ENDPOINTS = [
  'status',
  'leagues',
  'seasons',
  'teams',
  'standings',
  'fixtures',
  'fixtures/events',
  'fixtures/lineups',
  'fixtures/statistics',
  'players',
] as const

export type ApiFootballEndpoint = (typeof API_FOOTBALL_ENDPOINTS)[number]

export function isApiFootballEndpoint(value: string): value is ApiFootballEndpoint {
  return (API_FOOTBALL_ENDPOINTS as readonly string[]).includes(value)
}

function getApiKey(): string {
  const key = process.env.API_FOOTBALL_KEY
  if (!key) {
    throw new Error('API_FOOTBALL_KEY must be set in .env.local')
  }
  return key
}

export interface ApiFootballResult {
  status: number
  ok: boolean
  rateLimit: {
    limitDay: string | null
    remainingDay: string | null
  }
  body: unknown
}

export async function callApiFootball(
  endpoint: ApiFootballEndpoint,
  params: Record<string, string>
): Promise<ApiFootballResult> {
  const url = new URL(`${API_FOOTBALL_BASE_URL}/${endpoint}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== '') url.searchParams.set(key, value)
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-apisports-key': getApiKey(),
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  const body = await res.json().catch(() => null)

  return {
    status: res.status,
    ok: res.ok,
    rateLimit: {
      limitDay: res.headers.get('x-ratelimit-requests-limit'),
      remainingDay: res.headers.get('x-ratelimit-requests-remaining'),
    },
    body,
  }
}

/**
 * Ligue 1 Tunisie : id stable côté API-Football (les id de ligue ne changent
 * jamais de saison en saison).
 */
export const TUNISIA_LEAGUE_ID = 202

/**
 * Le plan Free d'API-Football ne donne accès qu'à une fenêtre de saisons
 * passées (constaté à l'usage : "Free plans do not have access to this
 * season, try from 2022 to 2024" dès qu'on demande la saison en cours).
 * 2024 est donc la dernière saison complète interrogeable pour
 * fixtures/standings ; seul le live (`fixtures?live=all`) reste disponible
 * en temps réel quelle que soit la saison en cours.
 */
export const TUNISIA_LATEST_SEASON = 2024

interface CacheEntry {
  expiresAt: number
  result: ApiFootballResult
}

const cache = new Map<string, CacheEntry>()

/**
 * Variante cachée en mémoire de callApiFootball, pour protéger le quota de
 * 100 requêtes/jour du plan Free face à un trafic public sur /testapi : tous
 * les visiteurs partagent la même donnée pendant la durée du TTL au lieu de
 * déclencher un appel amont chacun.
 */
export async function callApiFootballCached(
  endpoint: ApiFootballEndpoint,
  params: Record<string, string>,
  ttlMs: number
): Promise<ApiFootballResult> {
  const cacheKey = `${endpoint}?${new URLSearchParams(params).toString()}`
  const cached = cache.get(cacheKey)
  const now = Date.now()

  if (cached && cached.expiresAt > now) {
    return cached.result
  }

  const result = await callApiFootball(endpoint, params)

  // On ne met en cache que les réponses exploitables : une erreur amont ne
  // doit pas rester servie pendant tout le TTL.
  if (result.ok) {
    cache.set(cacheKey, { expiresAt: now + ttlMs, result })
  }

  return result
}

const FIXTURE_INFO_TTL_MS = 60 * 1000
const FIXTURE_DETAIL_LONG_TTL_MS = 7 * 24 * 60 * 60 * 1000
const FIXTURE_DETAIL_LIVE_TTL_MS = 30 * 1000
const LINEUPS_TTL_MS = 5 * 60 * 1000

// Statuts pour lesquels le résultat du match est figé : les events et
// lineups ne changeront plus jamais, on peut les mettre en cache longtemps.
const FIXTURE_FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO'])

export interface FixtureInfo {
  fixture: {
    id: number
    referee: string | null
    date: string
    status: { long: string; short: string; elapsed: number | null }
    venue: { id: number | null; name: string | null; city: string | null }
  }
  league: { id: number; name: string; country: string; logo: string; flag: string | null; season: number; round: string }
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null }
    away: { id: number; name: string; logo: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
  score: {
    halftime: { home: number | null; away: number | null }
    fulltime: { home: number | null; away: number | null }
    extratime: { home: number | null; away: number | null }
    penalty: { home: number | null; away: number | null }
  }
}

export interface FixtureEvent {
  time: { elapsed: number; extra: number | null }
  team: { id: number; name: string; logo: string }
  player: { id: number | null; name: string | null }
  assist: { id: number | null; name: string | null }
  type: string
  detail: string
  comments: string | null
}

export interface FixtureLineup {
  team: { id: number; name: string; logo: string }
  coach: { id: number; name: string; photo: string | null }
  formation: string | null
  startXI: Array<{ player: { id: number; name: string; number: number | null; pos: string | null } }>
  substitutes: Array<{ player: { id: number; name: string; number: number | null; pos: string | null } }>
}

export interface TunisiaFixtureDetail {
  fixture: FixtureInfo
  events: FixtureEvent[]
  lineups: FixtureLineup[]
}

/**
 * Détail complet d'un match (infos + events + lineups), composé de 3 appels
 * amont mis en cache indépendamment. Autorisé pour :
 *  - n'importe quel match de la Ligue 1 Tunisie (le coeur de /testapi)
 *  - n'importe quel match EN DIRECT, toute compétition confondue (le plan
 *    Free n'a accès qu'aux saisons passées pour la Tunisie, donc en dehors
 *    des périodes où un match tunisien est réellement en cours, l'onglet
 *    "En direct" retombe sur les matchs live du monde entier ; il faut donc
 *    pouvoir en afficher le détail).
 * Tout le reste (un id d'un vieux match d'une autre ligue) est refusé, pour
 * éviter que /testapi/[id] ne devienne un explorateur ouvert de l'historique
 * complet d'API-Football et ne consomme le quota en scraping.
 */
export async function getTunisiaFixtureDetail(fixtureId: string): Promise<TunisiaFixtureDetail | null> {
  const infoResult = await callApiFootballCached('fixtures', { id: fixtureId }, FIXTURE_INFO_TTL_MS)
  const infoBody = infoResult.body as { response?: TunisiaFixtureDetail['fixture'][] } | null
  const fixture = infoBody?.response?.[0]

  if (!infoResult.ok || !fixture) {
    return null
  }

  const isTunisia = fixture.league?.id === TUNISIA_LEAGUE_ID
  const isCurrentlyLive = LIVE_STATUSES.has(fixture.fixture?.status?.short ?? '')
  if (!isTunisia && !isCurrentlyLive) {
    return null
  }

  const isFinished = FIXTURE_FINISHED_STATUSES.has(fixture.fixture?.status?.short ?? '')
  const eventsTtl = isFinished ? FIXTURE_DETAIL_LONG_TTL_MS : FIXTURE_DETAIL_LIVE_TTL_MS
  const lineupsTtl = isFinished ? FIXTURE_DETAIL_LONG_TTL_MS : LINEUPS_TTL_MS

  const [eventsResult, lineupsResult] = await Promise.all([
    callApiFootballCached('fixtures/events', { fixture: fixtureId }, eventsTtl),
    callApiFootballCached('fixtures/lineups', { fixture: fixtureId }, lineupsTtl),
  ])

  return {
    fixture,
    events: (eventsResult.body as { response?: FixtureEvent[] } | null)?.response ?? [],
    lineups: (lineupsResult.body as { response?: FixtureLineup[] } | null)?.response ?? [],
  }
}

// ── Mapping équipes/matchs (/admin/api-football) ────────────────────────────
// Recherches assistées pour que l'opérateur choisisse manuellement le bon
// id API-Football (teams.api_football_id / matches.api_football_fixture_id).
// Jamais de rapprochement automatique par nom : les noms libres divergent
// trop souvent (accents, abréviations, variantes) pour être fiables — voir
// superadmin/matching.md.

const TEAM_SEARCH_TTL_MS = 5 * 60 * 1000
const FIXTURE_SEARCH_TTL_MS = 60 * 1000
const LIVE_FIXTURES_SEARCH_TTL_MS = 15 * 1000

export interface ApiFootballTeamSearchResult {
  id: number
  name: string
  logo: string
  country: string | null
}

interface RawTeamSearchResponse {
  response?: Array<{
    team: { id: number; name: string; logo: string; country?: string | null }
  }>
}

/**
 * Recherche d'équipes API-Football par nom (endpoint `teams`, déjà dans la
 * liste blanche `API_FOOTBALL_ENDPOINTS`). L'API exige au moins 3 caractères
 * pour `search` — vérifié côté appelant (route API), pas ici.
 */
export async function searchApiFootballTeams(query: string): Promise<ApiFootballTeamSearchResult[]> {
  const result = await callApiFootballCached('teams', { search: query }, TEAM_SEARCH_TTL_MS)
  if (!result.ok) return []
  const body = result.body as RawTeamSearchResponse | null
  return (body?.response ?? []).map((entry) => ({
    id: entry.team.id,
    name: entry.team.name,
    logo: entry.team.logo,
    country: entry.team.country ?? null,
  }))
}

export interface ApiFootballFixtureSearchResult {
  id: number
  date: string
  statusShort: string
  homeTeam: string
  awayTeam: string
  leagueName: string
}

interface RawFixtureSearchResponse {
  response?: Array<{
    fixture: { id: number; date: string; status: { short: string } }
    teams: { home: { name: string }; away: { name: string } }
    league: { name: string }
  }>
}

function mapFixtureSearchResults(body: RawFixtureSearchResponse | null): ApiFootballFixtureSearchResult[] {
  return (body?.response ?? []).map((entry) => ({
    id: entry.fixture.id,
    date: entry.fixture.date,
    statusShort: entry.fixture.status.short,
    homeTeam: entry.teams.home.name,
    awayTeam: entry.teams.away.name,
    leagueName: entry.league.name,
  }))
}

/**
 * Recherche de fixtures API-Football à une date donnée (YYYY-MM-DD),
 * toutes compétitions confondues. Contrairement à `fixtures?league=+season=`
 * (bloqué en saison en cours sur le plan Free, voir TUNISIA_LATEST_SEASON
 * plus haut), une recherche par date seule reste accessible — mais un match
 * à venir peut malgré tout ne pas encore apparaître selon la couverture du
 * plan : à vérifier au cas par cas, pas une garantie.
 */
export async function searchApiFootballFixturesByDate(date: string): Promise<ApiFootballFixtureSearchResult[]> {
  const result = await callApiFootballCached('fixtures', { date }, FIXTURE_SEARCH_TTL_MS)
  if (!result.ok) return []
  return mapFixtureSearchResults(result.body as RawFixtureSearchResponse | null)
}

/**
 * Fixtures en direct, toutes compétitions confondues (`fixtures?live=all`) —
 * seul moyen fiable de retrouver le fixture_id d'un match une fois qu'il a
 * démarré, quand la recherche par date/saison ne le donne pas encore (voir
 * matching.md).
 */
export async function searchApiFootballLiveFixtures(): Promise<ApiFootballFixtureSearchResult[]> {
  const result = await callApiFootballCached('fixtures', { live: 'all' }, LIVE_FIXTURES_SEARCH_TTL_MS)
  if (!result.ok) return []
  return mapFixtureSearchResults(result.body as RawFixtureSearchResponse | null)
}
