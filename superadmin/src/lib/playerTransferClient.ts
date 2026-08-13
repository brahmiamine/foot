/**
 * Client HTTP vers `teamManager` pour le module de transfert/homologation
 * (migration.md §19-21, Phase 3) — même pattern que matchSagaClients.ts
 * (TASK-P0-003) : authentification par clé de service (`x-api-key`),
 * jusqu'à 3 tentatives sur échec RÉSEAU uniquement (une réponse HTTP reçue,
 * 4xx/5xx, est un refus métier explicite, jamais rejouée automatiquement).
 *
 * `player_transfers`, `Player.teamId` et `cms_team_members` restent
 * possédés et mutés uniquement par `teamManager` (seul endroit où les trois
 * écritures peuvent se faire dans une transaction DB unique, voir
 * PlayerTransferService.completeTransfer) — `superadmin` ne fait
 * qu'orchestrer via ces routes internes, jamais d'écriture directe.
 */

export class PlayerTransferClientError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlayerTransferClientError'
  }
}

const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 500

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.TEAMMANAGER_URL
  const apiKey = process.env.TEAMMANAGER_SERVICE_API_KEY
  if (!baseUrl || !apiKey) {
    throw new PlayerTransferClientError('TEAMMANAGER_URL/TEAMMANAGER_SERVICE_API_KEY non configurés.')
  }
  return { baseUrl, apiKey }
}

async function postJsonWithRetries<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const { baseUrl, apiKey } = getConfig()
  const url = `${baseUrl.replace(/\/$/, '')}${path}`

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
      throw new PlayerTransferClientError(reason)
    }

    const responseBody = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = typeof responseBody?.error === 'string' ? responseBody.error : `a répondu ${response.status}`
      throw new PlayerTransferClientError(message)
    }
    return responseBody as T
  }

  throw new PlayerTransferClientError('Nombre maximal de tentatives atteint')
}

export interface RemotePlayerTransfer {
  id: string
  playerId: string
  fromTeamId: string
  toTeamId: string
  transferType: string
  status: string
  effectiveDate: string
  approvedBy?: string | null
}

export interface CreatePlayerTransferInput {
  playerId: string
  fromTeamId: string
  toTeamId: string
  transferType: 'PERMANENT' | 'LOAN' | 'LOAN_RETURN' | 'FREE_TRANSFER'
  effectiveDate: string
  seasonId?: string | null
  fee?: string | null
  currency?: string | null
  loanStartDate?: string | null
  loanEndDate?: string | null
  notes?: string | null
  createdBy?: string | null
}

export async function createPlayerTransfer(input: CreatePlayerTransferInput): Promise<RemotePlayerTransfer> {
  return postJsonWithRetries<RemotePlayerTransfer>('/api/internal/player-transfers', { ...input })
}

export async function completePlayerTransfer(transferId: string, approvedBy?: string | null): Promise<RemotePlayerTransfer> {
  return postJsonWithRetries<RemotePlayerTransfer>(`/api/internal/player-transfers/${transferId}/complete`, { approvedBy })
}

export async function closePlayerTransfer(
  transferId: string,
  status: 'CANCELLED' | 'REJECTED',
  reason?: string | null,
): Promise<RemotePlayerTransfer> {
  return postJsonWithRetries<RemotePlayerTransfer>(`/api/internal/player-transfers/${transferId}/close`, { status, reason })
}
