'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const MODULES = [
  { key: 'commissions', label: 'Commissions fédérales', hint: 'Séances, quorum, délibérations et décisions signées.' },
  { key: 'insurance', label: 'Assurances', hint: 'Couverture des clubs et des personnes, échéances et revue.' },
  { key: 'training-compensation', label: 'Indemnités de formation', hint: 'Dossiers, clubs formateurs, calcul et décision.' },
  { key: 'solidarity', label: 'Mécanisme de solidarité', hint: 'Contribution calculée et répartition entre clubs bénéficiaires.' },
  { key: 'grants', label: 'Subventions', hint: 'Campagnes, enveloppes et demandes des clubs.' },
  { key: 'broadcasting', label: 'Droits média', hint: 'Enveloppes et redistribution financière contrôlée.' },
  { key: 'documents', label: 'Conformité documentaire', hint: 'Exigences, versions, validité et expiration.' },
  { key: 'national-teams', label: 'Sélections nationales / DTN', hint: 'Sélections, événements et convocations.' },
] as const

type Domain = (typeof MODULES)[number]['key']
type Row = Record<string, unknown>

function extractRows(payload: unknown): Row[] {
  if (Array.isArray(payload)) return payload.filter((item): item is Row => Boolean(item) && typeof item === 'object')
  if (payload && typeof payload === 'object') {
    const candidate = (payload as Record<string, unknown>).items
    if (Array.isArray(candidate)) return candidate.filter((item): item is Row => Boolean(item) && typeof item === 'object')
  }
  return []
}

function text(row: Row, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return '—'
}

export default function AdminFederalOperationsManager() {
  const [domain, setDomain] = useState<Domain>('commissions')
  const [payload, setPayload] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const active = useMemo(() => MODULES.find((module) => module.key === domain) ?? MODULES[0], [domain])
  const rows = useMemo(() => extractRows(payload), [payload])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/federal-operations/${domain}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Chargement impossible')
      setPayload(body)
    } catch (caught) {
      setPayload(null)
      setError(caught instanceof Error ? caught.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [domain])

  useEffect(() => { void load() }, [load])

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Federal Operations V3</p>
        <h1 className="text-3xl font-bold text-slate-900">Pilotage réglementaire fédéral</h1>
        <p className="max-w-3xl text-sm text-slate-600">Les validations restent serveur, auditées et scopées par plateforme, fédération ou ligue. Les décisions de commission exigent un quorum calculé côté serveur.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {MODULES.map((module) => (
          <button key={module.key} type="button" onClick={() => setDomain(module.key)} className={`rounded-xl border p-4 text-left transition ${domain === module.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:border-slate-400'}`}>
            <span className="block font-semibold">{module.label}</span>
            <span className={`mt-1 block text-xs ${domain === module.key ? 'text-slate-200' : 'text-slate-500'}`}>{module.hint}</span>
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div><h2 className="text-xl font-semibold">{active.label}</h2><p className="text-sm text-slate-500">{active.hint}</p></div>
          <button type="button" onClick={() => void load()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">Actualiser</button>
        </div>
        {loading ? <p className="text-sm text-slate-500">Chargement…</p> : null}
        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {!loading && !error && rows.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Aucun dossier pour ce périmètre.</p> : null}
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Référence</th><th className="px-3 py-2">Libellé</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Périmètre</th></tr></thead>
              <tbody>{rows.map((row, index) => <tr key={text(row, ['id']) + index} className="border-b last:border-0"><td className="px-3 py-3 font-medium">{text(row, ['decision_number', 'reference_number', 'policy_number', 'code', 'id'])}</td><td className="px-3 py-3">{text(row, ['name', 'title', 'summary', 'provider', 'purpose'])}</td><td className="px-3 py-3">{text(row, ['status'])}</td><td className="px-3 py-3 text-slate-500">{text(row, ['league_id', 'federation_id', 'season_id'])}</td></tr>)}</tbody>
            </table>
          </div>
        ) : null}
      </section>

      <a href="/admin/season-cycles" className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Ouvrir le cycle réglementaire annuel</a>
    </div>
  )
}
