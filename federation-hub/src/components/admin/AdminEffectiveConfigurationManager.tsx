'use client'

import { FormEvent, useState } from 'react'

type PolicySource = {
  kind: 'DEFAULT' | 'POLICY'
  recordId?: string
  scopeType?: string
  scopeId?: string | null
  version?: number
  effectiveFrom?: string | Date | null
  effectiveUntil?: string | Date | null
}

type EffectiveEntry = {
  domain: string
  key: string
  value: unknown
  source: PolicySource
}

type EffectiveSection = {
  domain: string
  label: string
  entries: EffectiveEntry[]
  appliedRecords: Array<{ id: string; scopeType: string; scopeId: string | null; version: number }>
}

type ResponseBody = {
  at: string
  context: { federationId: string; leagueId: string | null; seasonId: string | null }
  sections: EffectiveSection[]
}

function formatValue(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (typeof value === 'string') return value || '—'
  if (Array.isArray(value)) return value.join(', ') || '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('fr-FR')
}

function sourceLabel(source: PolicySource): string {
  if (source.kind === 'DEFAULT') return 'Valeur par défaut'
  const parts = [
    source.scopeType ?? 'POLICY',
    source.scopeId ?? null,
    source.version ? `v${source.version}` : null,
    formatDate(source.effectiveFrom) ? `depuis ${formatDate(source.effectiveFrom)}` : null,
    formatDate(source.effectiveUntil) ? `jusqu'au ${formatDate(source.effectiveUntil)}` : null,
  ]
  return parts.filter(Boolean).join(' · ')
}

export default function AdminEffectiveConfigurationManager() {
  const [payload, setPayload] = useState<ResponseBody | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolve = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const federationId = String(form.get('federationId') ?? '').trim()
    const leagueId = String(form.get('leagueId') ?? '').trim()
    const seasonId = String(form.get('seasonId') ?? '').trim()
    const at = String(form.get('at') ?? '').trim()
    if (!federationId) {
      setError('La fédération est obligatoire.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams({ federationId })
      if (leagueId) query.set('leagueId', leagueId)
      if (seasonId) query.set('seasonId', seasonId)
      if (at) query.set('at', new Date(at).toISOString())
      const response = await fetch(`/api/admin/effective-configuration?${query.toString()}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Résolution impossible')
      setPayload(body as ResponseBody)
    } catch (caught) {
      setPayload(null)
      setError(caught instanceof Error ? caught.message : 'Résolution impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">GOV-006 · Configuration effective</p>
        <h1 className="text-3xl font-bold text-slate-900">Configuration effective</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Inspecte la valeur réellement appliquée côté serveur et la version qui l&apos;a fournie. Les héritages PLATFORM → FÉDÉRATION → LIGUE → SAISON sont expliqués clé par clé.
        </p>
      </div>

      <form onSubmit={(event) => void resolve(event)} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field name="federationId" label="Fédération ID" required placeholder="obligatoire" />
          <Field name="leagueId" label="Ligue ID" placeholder="optionnel" />
          <Field name="seasonId" label="Saison / compétition ID" placeholder="optionnel" />
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Résoudre à la date</span>
            <input name="at" type="datetime-local" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
          </label>
        </div>
        <div className="mt-4">
          <button type="submit" disabled={loading} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? 'Résolution…' : 'Résoudre la configuration'}
          </button>
        </div>
      </form>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {payload ? (
        <>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Résolue au <strong>{new Date(payload.at).toLocaleString('fr-FR')}</strong> · fédération <code>{payload.context.federationId}</code>
            {payload.context.leagueId ? <> · ligue <code>{payload.context.leagueId}</code></> : null}
            {payload.context.seasonId ? <> · saison <code>{payload.context.seasonId}</code></> : null}
          </div>

          {payload.sections.map((section) => (
            <section key={section.domain} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-5">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{section.label}</h2>
                  <code className="text-xs text-slate-500">{section.domain}</code>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                  {section.appliedRecords.length} version{section.appliedRecords.length > 1 ? 's' : ''} appliquée{section.appliedRecords.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Clé</th>
                      <th className="px-5 py-3">Valeur effective</th>
                      <th className="px-5 py-3">Provenance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.entries.map((entry) => (
                      <tr key={`${section.domain}:${entry.key}`} className="border-b last:border-0">
                        <td className="px-5 py-3 font-mono text-xs">{entry.key}</td>
                        <td className="px-5 py-3 break-all">{formatValue(entry.value)}</td>
                        <td className="px-5 py-3 text-slate-500">{sourceLabel(entry.source)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </>
      ) : null}
    </div>
  )
}

function Field({ name, label, placeholder, required = false }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input name={name} required={required} placeholder={placeholder} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
    </label>
  )
}
