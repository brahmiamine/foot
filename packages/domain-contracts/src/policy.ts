export type PolicyScopeType =
  | 'PLATFORM'
  | 'FEDERATION'
  | 'LEAGUE'
  | 'SEASON'
  | 'COMPETITION'
  | 'CLUB'
  | 'CATEGORY'
  | 'MATCH'

export interface PolicyContext {
  federationId?: string | null
  leagueId?: string | null
  seasonId?: string | null
  competitionId?: string | null
  clubId?: string | null
  category?: string | null
  matchId?: string | null
}

export interface PolicyRecord<T extends object> {
  id: string
  scopeType: PolicyScopeType
  /** PLATFORM records use a null/omitted scopeId. */
  scopeId?: string | null
  /** Versions are monotonically increasing snapshots inside one scope. */
  version: number
  effectiveFrom?: string | Date | null
  effectiveUntil?: string | Date | null
  /** Undefined means inherit. Null remains an explicit value when allowed by T. */
  values: Partial<T>
}

export interface PolicyValueSource {
  kind: 'DEFAULT' | 'POLICY'
  recordId?: string
  scopeType?: PolicyScopeType
  scopeId?: string | null
  version?: number
  effectiveFrom?: string | Date | null
  effectiveUntil?: string | Date | null
}

export interface ResolvedPolicy<T extends object> {
  values: T
  sources: { [K in keyof T]: PolicyValueSource }
  appliedRecords: Array<Pick<PolicyRecord<T>, 'id' | 'scopeType' | 'scopeId' | 'version'>>
}

const POLICY_SCOPE_PRECEDENCE: Record<PolicyScopeType, number> = {
  PLATFORM: 0,
  FEDERATION: 10,
  LEAGUE: 20,
  SEASON: 30,
  COMPETITION: 40,
  CLUB: 50,
  CATEGORY: 60,
  MATCH: 70,
}

function asTimestamp(value: string | Date | null | undefined): number | null {
  if (value == null) return null
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value)
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid policy effective date: ${String(value)}`)
  return timestamp
}

export function isPolicyRecordActive<T extends object>(record: PolicyRecord<T>, at: Date): boolean {
  const point = at.getTime()
  const from = asTimestamp(record.effectiveFrom)
  const until = asTimestamp(record.effectiveUntil)
  return (from == null || point >= from) && (until == null || point < until)
}

export function policyScopeMatchesContext<T extends object>(
  record: PolicyRecord<T>,
  context: PolicyContext,
): boolean {
  switch (record.scopeType) {
    case 'PLATFORM':
      return record.scopeId == null
    case 'FEDERATION':
      return Boolean(context.federationId && record.scopeId === context.federationId)
    case 'LEAGUE':
      return Boolean(context.leagueId && record.scopeId === context.leagueId)
    case 'SEASON':
      return Boolean(context.seasonId && record.scopeId === context.seasonId)
    case 'COMPETITION':
      return Boolean(context.competitionId && record.scopeId === context.competitionId)
    case 'CLUB':
      return Boolean(context.clubId && record.scopeId === context.clubId)
    case 'CATEGORY':
      return Boolean(context.category && record.scopeId === context.category)
    case 'MATCH':
      return Boolean(context.matchId && record.scopeId === context.matchId)
  }
}

function selectLatestActiveSnapshot<T extends object>(records: PolicyRecord<T>[]): PolicyRecord<T> {
  const maxVersion = Math.max(...records.map((record) => record.version))
  const latest = records.filter((record) => record.version === maxVersion)
  if (latest.length !== 1) {
    const sample = latest[0]
    throw new Error(
      `Ambiguous active policy at ${sample.scopeType}:${sample.scopeId ?? 'PLATFORM'} version ${maxVersion}`,
    )
  }
  return latest[0]
}

/**
 * Resolve a complete effective policy from immutable defaults plus scoped
 * snapshots. More specific scopes override broader scopes, while undefined
 * fields inherit. The returned `sources` map explains exactly which record
 * supplied every effective value.
 */
export function resolvePolicy<T extends object>(
  defaults: T,
  records: PolicyRecord<T>[],
  context: PolicyContext,
  at: Date = new Date(),
): ResolvedPolicy<T> {
  const knownKeys = new Set(Object.keys(defaults))
  const matching = records.filter(
    (record) => policyScopeMatchesContext(record, context) && isPolicyRecordActive(record, at),
  )

  for (const record of matching) {
    if (!Number.isInteger(record.version) || record.version < 1) {
      throw new Error(`Policy ${record.id} has invalid version ${record.version}`)
    }
    for (const key of Object.keys(record.values)) {
      if (!knownKeys.has(key)) throw new Error(`Policy ${record.id} contains unknown key ${key}`)
    }
  }

  const byScope = new Map<string, PolicyRecord<T>[]>()
  for (const record of matching) {
    const scopeKey = `${record.scopeType}:${record.scopeId ?? 'PLATFORM'}`
    const group = byScope.get(scopeKey) ?? []
    group.push(record)
    byScope.set(scopeKey, group)
  }

  const selected = Array.from(byScope.values())
    .map(selectLatestActiveSnapshot)
    .sort((a, b) => POLICY_SCOPE_PRECEDENCE[a.scopeType] - POLICY_SCOPE_PRECEDENCE[b.scopeType])

  const values = { ...defaults }
  const sources = Object.fromEntries(
    Object.keys(defaults).map((key) => [key, { kind: 'DEFAULT' as const }]),
  ) as { [K in keyof T]: PolicyValueSource }
  const mutableValues = values as Record<string, unknown>
  const mutableSources = sources as Record<string, PolicyValueSource>

  for (const record of selected) {
    for (const [key, value] of Object.entries(record.values)) {
      if (value === undefined) continue
      mutableValues[key] = value
      mutableSources[key] = {
        kind: 'POLICY',
        recordId: record.id,
        scopeType: record.scopeType,
        scopeId: record.scopeId ?? null,
        version: record.version,
        effectiveFrom: record.effectiveFrom ?? null,
        effectiveUntil: record.effectiveUntil ?? null,
      }
    }
  }

  return {
    values,
    sources,
    appliedRecords: selected.map(({ id, scopeType, scopeId, version }) => ({
      id,
      scopeType,
      scopeId: scopeId ?? null,
      version,
    })),
  }
}
