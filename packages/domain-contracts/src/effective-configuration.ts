import type { PolicyValueSource, ResolvedPolicy } from './policy'

export interface EffectiveConfigurationEntry {
  domain: string
  key: string
  value: unknown
  source: PolicyValueSource
}

export interface EffectiveConfigurationSection {
  domain: string
  label: string
  entries: EffectiveConfigurationEntry[]
  appliedRecords: Array<{
    id: string
    scopeType: string
    scopeId: string | null
    version: number
  }>
}

/**
 * GOV-006 — normalise une policy résolue en lignes affichables par tous les
 * centres de configuration. La provenance vient exclusivement de resolvePolicy
 * afin que l'UI n'ait jamais à réimplémenter l'héritage.
 */
export function toEffectiveConfigurationSection<T extends object>(
  domain: string,
  label: string,
  resolved: ResolvedPolicy<T>,
): EffectiveConfigurationSection {
  return {
    domain,
    label,
    entries: Object.keys(resolved.values).map((key) => ({
      domain,
      key,
      value: (resolved.values as Record<string, unknown>)[key],
      source: (resolved.sources as Record<string, PolicyValueSource>)[key] ?? { kind: 'DEFAULT' },
    })),
    appliedRecords: resolved.appliedRecords.map((record) => ({
      id: record.id,
      scopeType: record.scopeType,
      scopeId: record.scopeId ?? null,
      version: record.version,
    })),
  }
}
