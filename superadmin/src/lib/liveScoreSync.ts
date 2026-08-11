import type { DataSource } from 'typeorm'
import { getDataSource } from './db'
import { callApiFootballCached } from './apiFootball'
import { Match } from './entities'

const MAX_MATCHES_PER_RUN = 20
const FIXTURE_SYNC_TTL_MS = 30 * 1000

interface RawFixtureResponse {
  response?: Array<{
    fixture?: { status?: { short?: string; elapsed?: number | null } }
    goals?: { home: number | null; away: number | null }
  }>
}

export interface LiveScoreSyncMatchResult {
  matchId: string
  fixtureId: number
  scoreHome: number | null
  scoreAway: number | null
  minute: number | null
  statusShort: string | null
}

export interface LiveScoreSyncResult {
  candidates: number
  updated: number
  skippedMatchsheetActive: number
  errors: string[]
  details: LiveScoreSyncMatchResult[]
}

/**
 * Un match a-t-il une feuille `matchsheet` (`ms_sheets`) en cours ?
 *
 * `ms_sheets` appartient à `matchsheet` (voir db/OWNERSHIP.md) : aucune
 * entité TypeORM n'est déclarée côté superadmin pour cette table, une
 * requête brute suffit puisque les deux apps partagent la même base
 * physique `foot`. Lecture seule, jamais d'écriture.
 *
 * Convention volontairement prudente : toute ligne `ms_sheets` dont le
 * statut n'est pas `CLOSED` (`DRAFT`/`PRE_MATCH_SIGNED`/`IN_PROGRESS`/
 * `POST_MATCH_SIGNED`) est considérée comme une couverture active — pas
 * seulement `IN_PROGRESS` — pour ne jamais risquer d'écrire en parallèle
 * d'une feuille en préparation ou en cours de clôture. Si la lecture
 * échoue (table absente, base de `matchsheet` pas encore migrée dans cet
 * environnement...), on part du principe le plus sûr pour matchsheet :
 * NE PAS synchroniser ce match plutôt que de risquer une écriture
 * concurrente non vérifiée.
 */
async function hasActiveMatchsheetCoverage(dataSource: DataSource, matchId: string): Promise<boolean> {
  try {
    const rows: Array<{ status: string }> = await dataSource.query(
      'SELECT status FROM ms_sheets WHERE match_id = ? ORDER BY created_at DESC LIMIT 1',
      [matchId]
    )
    if (rows.length === 0) return false
    return rows[0].status !== 'CLOSED'
  } catch (error) {
    console.warn(
      `[liveScoreSync] Lecture de ms_sheets impossible pour le match ${matchId} — synchro ignorée par précaution.`,
      error
    )
    return true
  }
}

/**
 * Synchronise `matches.score_home`/`score_away` depuis API-Football pour les
 * matchs explicitement mappés (`api_football_fixture_id` renseigné depuis
 * /admin/api-football) et non couverts activement par une feuille
 * `matchsheet`. N'écrit JAMAIS `matches.status` — colonne exclusivement
 * pilotée par `matchsheet` (voir db/OWNERSHIP.md).
 *
 * Appelée depuis /api/cron/live-scores, elle-même responsable de vérifier
 * qu'API_FOOTBALL_KEY est configuré avant d'appeler cette fonction (voir ce
 * fichier pour le comportement "inactif" sans clé).
 */
export async function syncLiveScores(): Promise<LiveScoreSyncResult> {
  const dataSource = await getDataSource()
  const matchRepo = dataSource.getRepository<Match>('matches')

  const candidates = await matchRepo
    .createQueryBuilder('match')
    .where('match.api_football_fixture_id IS NOT NULL')
    .orderBy('match.date', 'ASC')
    .limit(MAX_MATCHES_PER_RUN)
    .getMany()

  const result: LiveScoreSyncResult = {
    candidates: candidates.length,
    updated: 0,
    skippedMatchsheetActive: 0,
    errors: [],
    details: [],
  }

  for (const match of candidates) {
    const fixtureId = match.api_football_fixture_id
    if (!fixtureId) continue

    const activelyCovered = await hasActiveMatchsheetCoverage(dataSource, match.id)
    if (activelyCovered) {
      result.skippedMatchsheetActive++
      continue
    }

    try {
      const apiResult = await callApiFootballCached('fixtures', { id: String(fixtureId) }, FIXTURE_SYNC_TTL_MS)
      const body = apiResult.body as RawFixtureResponse | null
      const fixture = body?.response?.[0]

      if (!apiResult.ok || !fixture) {
        result.errors.push(`fixture ${fixtureId} (match ${match.id}) : réponse API-Football invalide ou vide`)
        continue
      }

      const scoreHome = fixture.goals?.home ?? null
      const scoreAway = fixture.goals?.away ?? null

      await matchRepo.update({ id: match.id }, { score_home: scoreHome, score_away: scoreAway })
      result.updated++
      result.details.push({
        matchId: match.id,
        fixtureId,
        scoreHome,
        scoreAway,
        minute: fixture.fixture?.status?.elapsed ?? null,
        statusShort: fixture.fixture?.status?.short ?? null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      result.errors.push(`fixture ${fixtureId} (match ${match.id}) : ${message}`)
    }
  }

  return result
}
