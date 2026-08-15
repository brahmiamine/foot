import type {
  ClubLineupReadPort,
  ClubMatchLineupEntry,
} from '../../domain-contracts/src/club-lineup'

export interface ClubClientOptions {
  baseUrl: string
  apiKey: string
  timeoutMs?: number
  lineupPath?: string
}

export class ClubClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'ClubClientError'
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, '')
}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as
    | { error?: unknown; message?: unknown }
    | null
  if (typeof body?.error === 'string') return body.error
  if (typeof body?.message === 'string') return body.message
  return `club service responded ${response.status}`
}

export class ClubHttpClient implements ClubLineupReadPort {
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly lineupPath: string

  constructor(private readonly options: ClubClientOptions) {
    if (!options.baseUrl || !options.apiKey) {
      throw new ClubClientError('Club service URL and API key are required')
    }
    this.baseUrl = normalizeBaseUrl(options.baseUrl)
    this.timeoutMs = options.timeoutMs ?? 5_000
    this.lineupPath = options.lineupPath ?? '/api/internal/matches'
  }

  private async getLineup(matchId: string, teamId?: string): Promise<ClubMatchLineupEntry[]> {
    const suffix = teamId ? `?teamId=${encodeURIComponent(teamId)}` : ''
    let response: Response
    try {
      response = await fetch(
        `${this.baseUrl}${this.lineupPath}/${encodeURIComponent(matchId)}/lineup${suffix}`,
        {
          method: 'GET',
          headers: { 'x-api-key': this.options.apiKey },
          signal: AbortSignal.timeout(this.timeoutMs),
        },
      )
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'network error'
      throw new ClubClientError(`Club service unavailable: ${reason}`)
    }

    if (!response.ok) {
      throw new ClubClientError(await readError(response), response.status)
    }

    const body = (await response.json()) as { lineup?: ClubMatchLineupEntry[] }
    return Array.isArray(body.lineup) ? body.lineup : []
  }

  findByMatch(matchId: string): Promise<ClubMatchLineupEntry[]> {
    return this.getLineup(matchId)
  }

  findByMatchAndTeam(matchId: string, teamId: string): Promise<ClubMatchLineupEntry[]> {
    return this.getLineup(matchId, teamId)
  }
}
