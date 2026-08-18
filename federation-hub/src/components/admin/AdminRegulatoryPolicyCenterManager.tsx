'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

const DELEGATABLE_OPERATIONS = [
  'insurance.review',
  'grant.manage',
  'grant.review',
  'broadcasting.manage',
  'training_compensation.decide',
  'solidarity.decide',
  'document_compliance.review',
  'club_license.approve',
  'discipline.decide',
  'appeal.decide',
] as const

const SCOPE_TYPES = ['FEDERATION', 'LEAGUE', 'SEASON'] as const

type PolicySource = { kind: 'DEFAULT' | 'POLICY'; recordId?: string; scopeType?: string; scopeId?: string | null; version?: number }
type ResolvedValues = {
  commissionRequiredForDiscipline: boolean
  commissionRequiredForAppeals: boolean
  commissionRequiredForClubLicensing: boolean
  delegatedOperations: string[]
  documentSignatureRequiredDomains: string[]
}
type ResolveResponse = {
  resolved: { values: ResolvedValues; sources: Record<string, PolicySource> }
  documentRequirements: Array<Record<string, unknown>>
}
type PolicyRecordRow = { id: string; scopeType: string; scopeId: string | null; version: number; reason: string; createdBy: string; createdAt: string; values: Partial<ResolvedValues> }

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'Chargement impossible')
  return body as T
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'Action impossible')
  return payload as T
}

function sourceLabel(source: PolicySource | undefined): string {
  if (!source || source.kind === 'DEFAULT') return 'Valeur par défaut (héritage historique)'
  return `${source.scopeType}${source.scopeId ? ` · ${source.scopeId}` : ''} · v${source.version}`
}

export default function AdminRegulatoryPolicyCenterManager() {
  const [federationId, setFederationId] = useState('')
  const [leagueId, setLeagueId] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [resolved, setResolved] = useState<ResolveResponse | null>(null)
  const [records, setRecords] = useState<PolicyRecordRow[]>([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const documentRequirements = useMemo(() => resolved?.documentRequirements ?? [], [resolved])

  const load = useCallback(async () => {
    if (!federationId.trim()) { setResolved(null); setRecords([]); return }
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams({ federationId: federationId.trim() })
      if (leagueId.trim()) query.set('leagueId', leagueId.trim())
      if (seasonId.trim()) query.set('seasonId', seasonId.trim())
      const [resolvedBody, recordsBody] = await Promise.all([
        getJson<ResolveResponse>(`/api/admin/regulatory-policy-center?${query.toString()}`),
        getJson<PolicyRecordRow[]>(`/api/admin/regulatory-policy-center/records?federationId=${encodeURIComponent(federationId.trim())}${leagueId.trim() ? `&leagueId=${encodeURIComponent(leagueId.trim())}` : ''}`),
      ])
      setResolved(resolvedBody)
      setRecords(recordsBody)
    } catch (caught) {
      setResolved(null)
      setRecords([])
      setError(caught instanceof Error ? caught.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [federationId, leagueId, seasonId])

  useEffect(() => { void load() }, [load])

  const createRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMutating(true)
    setError(null)
    setNotice(null)
    try {
      const form = new FormData(event.currentTarget)
      const scopeType = String(form.get('scopeType') ?? 'FEDERATION')
      const reason = String(form.get('reason') ?? '')
      const scopeIdRaw = String(form.get('scopeId') ?? '')
      const values: Record<string, unknown> = {}
      for (const key of ['commissionRequiredForDiscipline', 'commissionRequiredForAppeals', 'commissionRequiredForClubLicensing'] as const) {
        const raw = form.get(key)
        if (raw === 'true' || raw === 'false') values[key] = raw === 'true'
      }
      const delegated = form.getAll('delegatedOperations').map(String)
      if (delegated.length) values.delegatedOperations = delegated
      if (Object.keys(values).length === 0) throw new Error('Sélectionnez au moins une valeur de politique à définir')
      await postJson('/api/admin/regulatory-policy-center', {
        federationId: federationId.trim(),
        leagueId: leagueId.trim() || undefined,
        scopeType,
        scopeId: scopeType === 'SEASON' ? scopeIdRaw.trim() : undefined,
        reason,
        values,
      })
      event.currentTarget.reset()
      setNotice('Nouvelle version de politique enregistrée et auditée.')
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible')
    } finally {
      setMutating(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">FED-001 · Regulatory Policy Center</p>
        <h1 className="text-3xl font-bold text-slate-900">Politiques réglementaires</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Résolution hiérarchique PLATFORM → FÉDÉRATION → LIGUE → SAISON (une saison est une édition de compétition). Chaque valeur affiche sa provenance exacte.
          Les décisions de commission, la délégation fédération → ligue et les exigences de signature documentaire sont pilotées ici.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Scope à résoudre</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Fédération ID" value={federationId} onChange={setFederationId} placeholder="obligatoire" />
          <Input label="Ligue ID" value={leagueId} onChange={setLeagueId} placeholder="optionnel" />
          <Input label="Saison / compétition ID" value={seasonId} onChange={setSeasonId} placeholder="optionnel" />
        </div>
      </section>

      {loading ? <p className="text-sm text-slate-500">Chargement…</p> : null}
      {notice ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {resolved ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Configuration effective</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Clé</th><th className="px-3 py-2">Valeur effective</th><th className="px-3 py-2">Provenance</th></tr></thead>
              <tbody>
                {(Object.keys(resolved.resolved.values) as Array<keyof ResolvedValues>).map((key) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="px-3 py-3 font-mono text-xs">{key}</td>
                    <td className="px-3 py-3">{Array.isArray(resolved.resolved.values[key]) ? (resolved.resolved.values[key] as string[]).join(', ') || '—' : String(resolved.resolved.values[key])}</td>
                    <td className="px-3 py-3 text-slate-500">{sourceLabel(resolved.resolved.sources[key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Nouvelle version de politique</h2>
        <p className="mb-4 text-sm text-slate-500">Chaque changement crée une nouvelle version versionnée et auditée (motif obligatoire) — rien n&apos;est jamais modifié en place.</p>
        <form onSubmit={(event) => void createRecord(event)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Portée</span>
            <select name="scopeType" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              {SCOPE_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">ID de portée (si SAISON)</span>
            <input name="scopeId" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="requis seulement pour SEASON" />
          </label>
          <label className="text-sm md:col-span-1"><span className="mb-1 block font-medium text-slate-700">Motif du changement</span>
            <input name="reason" required minLength={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="obligatoire, audité" />
          </label>

          <BoolSelect name="commissionRequiredForDiscipline" label="Commission obligatoire — discipline" />
          <BoolSelect name="commissionRequiredForAppeals" label="Commission obligatoire — appels" />
          <BoolSelect name="commissionRequiredForClubLicensing" label="Commission obligatoire — licences club" />

          <fieldset className="md:col-span-3">
            <legend className="mb-1 text-sm font-medium text-slate-700">Opérations déléguées à la ligue (FED-004)</legend>
            <div className="grid gap-2 md:grid-cols-3">
              {DELEGATABLE_OPERATIONS.map((operation) => (
                <label key={operation} className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" name="delegatedOperations" value={operation} className="rounded border-slate-300" />
                  {operation}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-end"><button type="submit" disabled={mutating} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Enregistrer la version</button></div>
        </form>
      </section>

      {documentRequirements.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Exigences documentaires applicables (FED-002/003)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Domaine</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Nom</th><th className="px-3 py-2">Obligatoire</th><th className="px-3 py-2">Signature</th><th className="px-3 py-2">Vérification</th></tr></thead>
              <tbody>
                {documentRequirements.map((row, index) => (
                  <tr key={String(row.id ?? index)} className="border-b last:border-0">
                    <td className="px-3 py-3">{String(row.domain ?? '—')}</td>
                    <td className="px-3 py-3 font-mono text-xs">{String(row.code ?? '—')}</td>
                    <td className="px-3 py-3">{String(row.name ?? '—')}</td>
                    <td className="px-3 py-3">{row.mandatory ? 'Oui' : 'Non'}</td>
                    <td className="px-3 py-3">{row.signature_required ? 'Requise' : '—'}</td>
                    <td className="px-3 py-3">{String(row.verification_method ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {records.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Historique des versions</h2>
          <div className="space-y-2">
            {records.map((record) => (
              <div key={record.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                <span className="font-medium">{record.scopeType}{record.scopeId ? ` · ${record.scopeId}` : ''} · v{record.version}</span>
                <span className="ml-2 text-slate-500">{record.reason}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
}

function BoolSelect({ name, label }: { name: string; label: string }) {
  return <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span>
    <select name={name} defaultValue="" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
      <option value="">Ne pas définir ici (hériter)</option>
      <option value="true">Activer</option>
      <option value="false">Désactiver</option>
    </select>
  </label>
}
