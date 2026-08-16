export type ClassValue = string | false | null | undefined

export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new Error(`${message}: ${String(value)}`)
}

export type DomainBoundaryMode = 'http' | 'shared-db'

export function selectDomainBoundaryMode(input: {
  boundary: string
  baseUrl?: string
  apiKey?: string
  requireHttp?: boolean
}): DomainBoundaryMode {
  const hasUrl = Boolean(input.baseUrl?.trim())
  const hasKey = Boolean(input.apiKey?.trim())
  if (hasUrl !== hasKey) {
    throw new Error(`${input.boundary}: service URL and API key must be configured together`)
  }

  const mode: DomainBoundaryMode = hasUrl ? 'http' : 'shared-db'
  const payload = JSON.stringify({
    event: 'domain_boundary_adapter',
    boundary: input.boundary,
    mode,
  })

  if (mode === 'shared-db') {
    if (input.requireHttp) {
      console.error(payload)
      throw new Error(`${input.boundary}: HTTP boundary is required; shared-db fallback is disabled`)
    }
    console.warn(payload)
  } else {
    console.info(payload)
  }

  return mode
}
