import type {
  RefereeAvailabilityBatchRequest,
  RefereeAvailabilityBatchResult,
  RefereeAvailabilityCheckRequest,
  RefereeAvailabilityDirectoryPort,
  RefereeAvailabilityPort,
  RefereeAvailabilityResult,
} from '../../domain-contracts/src/referee-availability'

export interface RefereeClientOptions {
  baseUrl: string
  apiKey: string
  timeoutMs?: number
  availabilityPath?: string
  availabilityBatchPath?: string
}

export class RefereeClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'RefereeClientError'
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
  return `referee service responded ${response.status}`
}

export class RefereeHttpClient
  implements RefereeAvailabilityPort, RefereeAvailabilityDirectoryPort
{
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly availabilityPath: string
  private readonly availabilityBatchPath: string

  constructor(private readonly options: RefereeClientOptions) {
    if (!options.baseUrl || !options.apiKey) {
      throw new RefereeClientError('Referee service URL and API key are required')
    }
    this.baseUrl = normalizeBaseUrl(options.baseUrl)
    this.timeoutMs = options.timeoutMs ?? 5_000
    this.availabilityPath = options.availabilityPath ?? '/api/internal/availability/check'
    this.availabilityBatchPath =
      options.availabilityBatchPath ?? '/api/internal/availability/check-batch'
  }

  private async post<TResult>(path: string, payload: unknown): Promise<TResult> {
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.options.apiKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'network error'
      throw new RefereeClientError(`Referee service unavailable: ${reason}`)
    }

    if (!response.ok) {
      throw new RefereeClientError(await readError(response), response.status)
    }

    return response.json() as Promise<TResult>
  }

  checkAvailability(
    input: RefereeAvailabilityCheckRequest,
  ): Promise<RefereeAvailabilityResult> {
    return this.post<RefereeAvailabilityResult>(this.availabilityPath, input)
  }

  checkAvailabilityBatch(
    input: RefereeAvailabilityBatchRequest,
  ): Promise<RefereeAvailabilityBatchResult> {
    return this.post<RefereeAvailabilityBatchResult>(this.availabilityBatchPath, input)
  }
}
