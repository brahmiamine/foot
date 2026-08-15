import type {
  EligibilityCheckRequest,
  EligibilityContext,
  EligibilityResult,
  EligibilityServicePort,
} from '../../domain-contracts/src/eligibility'
import type {
  HeadCoachQualificationCheckRequest,
  HeadCoachQualificationResult,
  StaffQualificationServicePort,
} from '../../domain-contracts/src/staff-eligibility'

export interface RegulatoryClientOptions {
  baseUrl: string
  apiKey: string
  timeoutMs?: number
  eligibilityPath?: string
  staffQualificationPath?: string
}

export class RegulatoryClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'RegulatoryClientError'
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, '')
}

async function readError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { error?: unknown; message?: unknown } | null
  if (typeof body?.error === 'string') return body.error
  if (typeof body?.message === 'string') return body.message
  return `regulatory service responded ${response.status}`
}

export class RegulatoryHttpClient
  implements EligibilityServicePort, StaffQualificationServicePort
{
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly eligibilityPath: string
  private readonly staffQualificationPath: string

  constructor(private readonly options: RegulatoryClientOptions) {
    if (!options.baseUrl || !options.apiKey) {
      throw new RegulatoryClientError('Regulatory service URL and API key are required')
    }
    this.baseUrl = normalizeBaseUrl(options.baseUrl)
    this.timeoutMs = options.timeoutMs ?? 5_000
    this.eligibilityPath = options.eligibilityPath ?? '/api/internal/regulatory/eligibility/player'
    this.staffQualificationPath =
      options.staffQualificationPath ?? '/api/internal/regulatory/eligibility/head-coach'
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
      throw new RegulatoryClientError(`Regulatory service unavailable: ${reason}`)
    }

    if (!response.ok) {
      throw new RegulatoryClientError(await readError(response), response.status)
    }

    return response.json() as Promise<TResult>
  }

  checkPlayerEligibility(
    input: EligibilityCheckRequest,
    context: EligibilityContext = {},
  ): Promise<EligibilityResult> {
    return this.post<EligibilityResult>(this.eligibilityPath, { input, context })
  }

  checkHeadCoachQualification(
    input: HeadCoachQualificationCheckRequest,
  ): Promise<HeadCoachQualificationResult> {
    return this.post<HeadCoachQualificationResult>(this.staffQualificationPath, {
      ...input,
      matchDate: input.matchDate instanceof Date ? input.matchDate.toISOString() : input.matchDate,
    })
  }
}
