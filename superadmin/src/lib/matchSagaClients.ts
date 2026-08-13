/**
 * Clients HTTP vers billetterie/teamManager pour les étapes de la saga
 * d'annulation de match (TASK-P0-003, todo.md). Authentification par clé
 * de service (`x-api-key`), même pattern que matchsheetClient.ts#reopenSheet
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

/** Étape "billetterie" de la saga : ferme la vente et ouvre les remboursements des billets déjà payés. */
export async function cancelMatchTickets(matchId: string): Promise<void> {
  const baseUrl = process.env.BILLETTERIE_URL
  const apiKey = process.env.BILLETTERIE_SERVICE_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('BILLETTERIE_URL/BILLETTERIE_SERVICE_API_KEY non configurés.')
  }
  const url = `${baseUrl.replace(/\/$/, '')}/api/internal/matches/${matchId}/cancel-tickets`
  await postWithRetries(url, apiKey)
}

/** Étape "teamManager" de la saga : annule (soft) les convocations liées à ce match. */
export async function cancelMatchConvocations(matchId: string, reason: string): Promise<void> {
  const baseUrl = process.env.TEAMMANAGER_URL
  const apiKey = process.env.TEAMMANAGER_SERVICE_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('TEAMMANAGER_URL/TEAMMANAGER_SERVICE_API_KEY non configurés.')
  }
  const url = `${baseUrl.replace(/\/$/, '')}/api/internal/matches/${matchId}/cancel-convocations`
  await postWithRetries(url, apiKey, { reason })
}
