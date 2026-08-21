/**
 * Client HTTP vers `match-operations` pour l'affectation des officiels de match
 * (migration.md §11, Phase 4) — même pattern que matchOperationsClient.ts
 * (réouverture de feuille) et playerTransferClient.ts (transferts) :
 * authentification par clé de service, jusqu'à 3 tentatives sur échec
 * RÉSEAU uniquement.
 *
 * `match_official_assignments` reste possédée et mutée uniquement par
 * `match-operations` (c'est aussi lui qui vérifie l'affectation avant de laisser
 * un officiel accéder à un match, voir [matchId]/layout.tsx) — federation-hub
 * n'orchestre que via ces routes internes.
 */

export class MatchOfficialClientError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MatchOfficialClientError'
  }
}

const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 500

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.MATCH_OPERATIONS_URL
  const apiKey = process.env.MATCH_OPERATIONS_SERVICE_API_KEY
  if (!baseUrl || !apiKey) {
    throw new MatchOfficialClientError('MATCH_OPERATIONS_URL/MATCH_OPERATIONS_SERVICE_API_KEY non configurés.')
  }
  return { baseUrl, apiKey }
}

async function requestWithRetries<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const { baseUrl, apiKey } = getConfig()
  const url = `${baseUrl.replace(/\/$/, '')}${path}`

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(5000),
      })
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS)
        continue
      }
      const reason = error instanceof Error ? error.message : 'erreur réseau'
      throw new MatchOfficialClientError(reason)
    }

    const responseBody = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = typeof responseBody?.error === 'string' ? responseBody.error : `a répondu ${response.status}`
      throw new MatchOfficialClientError(message)
    }
    return responseBody as T
  }

  throw new MatchOfficialClientError('Nombre maximal de tentatives atteint')
}

export interface RemoteMatchOfficialAssignment {
  id: number
  matchId: string
  userId: string
  refereeId?: string | null
  role: string
  status: 'ACTIVE' | 'REVOKED'
  assignedBy?: string | null
}

export interface AssignMatchOfficialInput {
  userId: string
  role: 'CENTER_REFEREE' | 'ASSISTANT_REFEREE' | 'FOURTH_OFFICIAL' | 'MATCH_DELEGATE' | 'REFEREE_OBSERVER' | 'TEAM_REPRESENTATIVE'
  refereeId?: string | null
  assignedBy?: string | null
}

export async function assignMatchOfficial(matchId: string, input: AssignMatchOfficialInput): Promise<RemoteMatchOfficialAssignment> {
  return requestWithRetries<RemoteMatchOfficialAssignment>('POST', `/api/internal/matches/${matchId}/officials`, { ...input })
}

export async function listMatchOfficials(matchId: string): Promise<RemoteMatchOfficialAssignment[]> {
  return requestWithRetries<RemoteMatchOfficialAssignment[]>('GET', `/api/internal/matches/${matchId}/officials`)
}

export async function revokeMatchOfficial(matchId: string, assignmentId: number, revokedBy?: string | null): Promise<RemoteMatchOfficialAssignment> {
  return requestWithRetries<RemoteMatchOfficialAssignment>(
    'POST',
    `/api/internal/matches/${matchId}/officials/${assignmentId}/revoke`,
    { revokedBy },
  )
}

export type DesignationMode = 'MANUAL' | 'SUGGESTED' | 'AUTO'

export interface DesignationPolicy {
  mode: DesignationMode
  minRestHours: number
  requiredGrades: string[] | null
  minHistoryMatches: number
  maxDistanceKm: number | null
  version: number
  updatedBy: string | null
  updatedAt: string | null
}

export interface DesignationCandidateHint {
  userId: string
  grade?: string | null
  distanceKm?: number | null
}

export interface DesignationCandidateEvaluation {
  userId: string
  eligible: boolean
  reasons: string[]
  score: number
}

/** REF-006 — lecture seule : classe les candidats, ne crée jamais d'affectation. */
export async function rankMatchOfficialCandidates(
  matchId: string,
  candidates: DesignationCandidateHint[],
): Promise<{ policy: DesignationPolicy; evaluations: DesignationCandidateEvaluation[] }> {
  return requestWithRetries('POST', `/api/internal/matches/${matchId}/officials/candidates`, { candidates })
}

export async function getDesignationPolicy(): Promise<DesignationPolicy> {
  return requestWithRetries('GET', '/api/internal/designation-policy')
}
