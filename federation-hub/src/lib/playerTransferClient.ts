/** Client HTTP service-to-service vers club-hub pour le domaine transferts. */
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
  const baseUrl = process.env.CLUB_HUB_URL
  const apiKey = process.env.CLUB_HUB_SERVICE_API_KEY
  if (!baseUrl || !apiKey) throw new PlayerTransferClientError('CLUB_HUB_URL/CLUB_HUB_SERVICE_API_KEY non configurés.')
  return { baseUrl, apiKey }
}

async function requestWithRetries<T>(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>): Promise<T> {
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
      throw new PlayerTransferClientError(error instanceof Error ? error.message : 'erreur réseau')
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

async function postJsonWithRetries<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  return requestWithRetries<T>('POST', path, body)
}

export interface RemotePlayerTransfer {
  id: string
  playerId: string
  fromTeamId: string
  toTeamId: string
  transferType: string
  status: string
  effectiveDate: string
  seasonId?: string | null
  fee?: string | null
  currency?: string | null
  loanStartDate?: string | null
  loanEndDate?: string | null
  notes?: string | null
  createdBy?: string | null
  approvedBy?: string | null
  destinationApprovedBy?: string | null
  destinationApprovedAt?: string | null
  homologatedBy?: string | null
  homologatedAt?: string | null
  statusReason?: string | null
  createdAt?: string
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

export async function listPlayerTransfers(status?: string): Promise<RemotePlayerTransfer[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return requestWithRetries<RemotePlayerTransfer[]>('GET', `/api/internal/player-transfers${query}`)
}

export async function getPlayerTransfer(transferId: string): Promise<RemotePlayerTransfer> {
  return requestWithRetries<RemotePlayerTransfer>(
    'GET',
    `/api/internal/player-transfers/${encodeURIComponent(transferId)}`,
  )
}

export async function approvePlayerTransfer(transferId: string, approvedBy: string): Promise<RemotePlayerTransfer> {
  return postJsonWithRetries<RemotePlayerTransfer>(`/api/internal/player-transfers/${transferId}/approve`, { approvedBy })
}

export async function completePlayerTransfer(transferId: string, homologatedBy?: string | null): Promise<RemotePlayerTransfer> {
  return postJsonWithRetries<RemotePlayerTransfer>(`/api/internal/player-transfers/${transferId}/complete`, { approvedBy: homologatedBy })
}

export async function closePlayerTransfer(
  transferId: string,
  status: 'CANCELLED' | 'REJECTED',
  reason?: string | null,
): Promise<RemotePlayerTransfer> {
  return postJsonWithRetries<RemotePlayerTransfer>(`/api/internal/player-transfers/${transferId}/close`, { status, reason })
}
