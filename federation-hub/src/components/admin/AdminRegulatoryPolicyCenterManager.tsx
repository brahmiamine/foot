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
type SlaPolicyRow = { domain: string; warnAfterHours: number; overdueAfterHours: number; isDefault: boolean }
type SlaQueueItem = { domain: string; entityId: string; label: string; hoursPending: number; state: 'DUE_SOON' | 'OVERDUE' }
type SlaResponse = { policies: SlaPolicyRow[]; overdueQueue: SlaQueueItem[] }

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
  const [sla, setSla] = useState<SlaResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const documentRequirements = useMemo(() => resolved?.documentRequirements ?? [], [resolved])

  const load = useCallback(async () => {
    if (!federationId.trim()) { setResolved(null); setRecords([]); setSla(null); return }
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams({ federationId: federationId.trim() })
      if (leagueId.trim()) query.set('leagueId', leagueId.trim())
      if (seasonId.trim()) query.set('seasonId', seasonId.trim())
      const [resolvedBody, recordsBody, slaBody] = await Promise.all([
        getJson<ResolveResponse>(`/api/admin/regulatory-policy-center?${query.toString()}`),
        getJson<PolicyRecordRow[]>(`/api/admin/regulatory-policy-center/records?federationId=${encodeURIComponent(federationId.trim())}${leagueId.trim() ? `&leagueId=${encodeURIComponent(leagueId.trim())}` : ''}`),
        getJson<SlaResponse>(`/api/admin/regulatory-sla?federationId=${encodeURIComponent(federationId.trim())}`),
      ])
      setResolved(resolvedBody)
      setRecords(recordsBody)
      setSla(slaBody)
    } catch (caught) {
      setResolved(null)
      setRecords([])
      setSla(null)
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

  const updateSlaPolicy = async (domain: string, warnAfterHours: number, overdueAfterHours: number) => {
    setMutating(true)
    setError(null)
    setNotice(null)
    try {
      await postJson('/api/admin/regulatory-sla', { federationId: federationId.trim(), domain, warnAfterHours, overdueAfterHours })
      setNotice('Seuils SLA mis à jour.')
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Mise à jour impossible')
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

      {sla ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">FED-010 · SLA réglementaires</h2>
          <p className="mb-4 text-sm text-slate-500">Délais d&apos;alerte/de dépassement par domaine (défaut appliqué tant qu&apos;aucun seuil explicite n&apos;est enregistré) et file d&apos;attente en retard calculée à la volée.</p>
          <div className="overflow-x-auto">
            <table className="mb-6 w-full text-left text-sm">
              <thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Domaine</th><th className="px-3 py-2">Alerte (h)</th><th className="px-3 py-2">Dépassement (h)</th><th className="px-3 py-2">Source</th></tr></thead>
              <tbody>
                {sla.policies.map((policy) => (
                  <SlaPolicyRowEditor key={policy.domain} policy={policy} disabled={mutating} onSave={updateSlaPolicy} />
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">File en retard ({sla.overdueQueue.length})</h3>
          {sla.overdueQueue.length === 0 ? <p className="text-sm text-slate-500">Aucun dossier en alerte ou en retard.</p> : (
            <div className="space-y-2">
              {sla.overdueQueue.map((item) => (
                <div key={`${item.domain}:${item.entityId}`} className={`rounded-lg p-3 text-sm ${item.state === 'OVERDUE' ? 'bg-red-50' : 'bg-amber-50'}`}>
                  <span className="font-medium">{item.domain}</span>
                  <span className="ml-2">{item.label}</span>
                  <span className="ml-2 text-slate-500">{Math.round(item.hoursPending)}h d&apos;attente · {item.state}</span>
                </div>
              ))}
            </div>
          )}
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

function SlaPolicyRowEditor({ policy, disabled, onSave }: { policy: SlaPolicyRow; disabled: boolean; onSave: (domain: string, warnAfterHours: number, overdueAfterHours: number) => Promise<void> }) {
  const [warnAfterHours, setWarnAfterHours] = useState(String(policy.warnAfterHours))
  const [overdueAfterHours, setOverdueAfterHours] = useState(String(policy.overdueAfterHours))
  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-2 font-mono text-xs">{policy.domain}</td>
      <td className="px-3 py-2"><input value={warnAfterHours} onChange={(event) => setWarnAfterHours(event.target.value)} className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1" /></td>
      <td className="px-3 py-2"><input value={overdueAfterHours} onChange={(event) => setOverdueAfterHours(event.target.value)} className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1" /></td>
      <td className="px-3 py-2 text-slate-500">
        {policy.isDefault ? 'Défaut' : 'Configuré'}
        <button type="button" disabled={disabled} onClick={() => void onSave(policy.domain, Number(warnAfterHours), Number(overdueAfterHours))} className="ml-2 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium disabled:opacity-50">Enregistrer</button>
      </td>
    </tr>
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
