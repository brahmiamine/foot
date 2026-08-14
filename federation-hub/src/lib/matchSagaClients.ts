/**
 * Clients HTTP vers ticketing/club-hub pour les étapes de la saga
 * d'annulation de match (TASK-P0-003, todo.md). Authentification par clé
 * de service (`x-api-key`), même pattern que matchOperationsClient.ts#reopenSheet
 * (TS-31) — jusqu'à 3 tentatives sur échec RÉSEAU uniquement (une réponse
 * HTTP reçue, 4xx/5xx, est un refus métier explicite, jamais rejouée
 * automatiquement ici ; matchSaga.ts décide quoi en faire).
 */

const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 500

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function postWithRetries(url: string, apiKey: string, body?: Record<string, unknown>): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
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
      throw new Error(reason)
    }

    if (!response.ok) {
      const responseBody = await response.json().catch(() => ({}))
      const message = typeof responseBody?.error === 'string' ? responseBody.error : `a répondu ${response.status}`
      throw new Error(message)
    }
    return
  }
}

/** Étape "ticketing" de la saga : ferme la vente et ouvre les remboursements des billets déjà payés. */
export async function cancelMatchTickets(matchId: string): Promise<void> {
  const baseUrl = process.env.TICKETING_URL
  const apiKey = process.env.TICKETING_SERVICE_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('TICKETING_URL/TICKETING_SERVICE_API_KEY non configurés.')
  }
  const url = `${baseUrl.replace(/\/$/, '')}/api/internal/matches/${matchId}/cancel-tickets`
  await postWithRetries(url, apiKey)
}

/** Étape "club-hub" de la saga : annule (soft) les convocations liées à ce match. */
export async function cancelMatchConvocations(matchId: string, reason: string): Promise<void> {
  const baseUrl = process.env.CLUB_HUB_URL
  const apiKey = process.env.CLUB_HUB_SERVICE_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('CLUB_HUB_URL/CLUB_HUB_SERVICE_API_KEY non configurés.')
  }
  const url = `${baseUrl.replace(/\/$/, '')}/api/internal/matches/${matchId}/cancel-convocations`
  await postWithRetries(url, apiKey, { reason })
}
