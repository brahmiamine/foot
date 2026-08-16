'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

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
type JsonBody = Record<string, unknown>

const NUMBER_FIELDS = new Set(['totalBudget', 'grossAmount', 'baseAmount', 'transferAmount', 'contributionRate', 'fixedQuorum'])
const JSON_FIELDS = new Set(['allocations', 'beneficiaries', 'distributionRules', 'eligibilityRules', 'agenda'])

function extractRows(payload: unknown): Row[] {
  if (Array.isArray(payload)) return payload.filter((item): item is Row => Boolean(item) && typeof item === 'object')
  if (payload && typeof payload === 'object') {
    const candidate = (payload as Record<string, unknown>).items
    if (Array.isArray(candidate)) return candidate.filter((item): item is Row => Boolean(item) && typeof item === 'object')
  }
  return []
}

function extractNamedRows(payload: unknown, key: string): Row[] {
  if (!payload || typeof payload !== 'object') return []
  const candidate = (payload as Record<string, unknown>)[key]
  return Array.isArray(candidate) ? candidate.filter((item): item is Row => Boolean(item) && typeof item === 'object') : []
}

function text(row: Row, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return '—'
}

function formBody(form: HTMLFormElement): JsonBody {
  const body: JsonBody = {}
  const data = new FormData(form)
  for (const [key, raw] of data.entries()) {
    if (typeof raw !== 'string') continue
    const value = raw.trim()
    if (!value) continue
    if (NUMBER_FIELDS.has(key)) {
      const number = Number(value)
      if (!Number.isFinite(number)) throw new Error(`${key} invalide`)
      body[key] = number
      continue
    }
    if (JSON_FIELDS.has(key)) {
      try {
        body[key] = JSON.parse(value) as unknown
      } catch {
        throw new Error(`${key} doit être un JSON valide`)
      }
      continue
    }
    body[key] = value
  }
  return body
}

async function postJson(url: string, body: JsonBody) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'Action impossible')
  return payload
}

export default function AdminFederalOperationsManager() {
  const [domain, setDomain] = useState<Domain>('commissions')
  const [payload, setPayload] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const active = useMemo(() => MODULES.find((module) => module.key === domain) ?? MODULES[0], [domain])
  const rows = useMemo(() => extractRows(payload), [payload])
  const sessions = useMemo(() => extractNamedRows(payload, 'sessions'), [payload])
  const decisions = useMemo(() => extractNamedRows(payload, 'decisions'), [payload])

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

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMutating(true)
    setError(null)
    setNotice(null)
    try {
      await postJson(`/api/admin/federal-operations/${domain}`, formBody(event.currentTarget))
      event.currentTarget.reset()
      setNotice('Dossier créé et audité.')
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Création impossible')
    } finally {
      setMutating(false)
    }
  }

  const act = async (action: string, body: JsonBody) => {
    setMutating(true)
    setError(null)
    setNotice(null)
    try {
      await postJson(`/api/admin/federal-operations/${domain}/${action}`, body)
      setNotice('Transition enregistrée.')
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Transition impossible')
    } finally {
      setMutating(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Federal Operations V3</p>
        <h1 className="text-3xl font-bold text-slate-900">Pilotage réglementaire fédéral</h1>
        <p className="max-w-3xl text-sm text-slate-600">Les validations restent serveur, auditées et scopées par plateforme, fédération ou ligue. Les décisions de commission exigent un quorum calculé côté serveur.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {MODULES.map((module) => (
          <button key={module.key} type="button" onClick={() => { setDomain(module.key); setNotice(null) }} className={`rounded-xl border p-4 text-left transition ${domain === module.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:border-slate-400'}`}>
            <span className="block font-semibold">{module.label}</span>
            <span className={`mt-1 block text-xs ${domain === module.key ? 'text-slate-200' : 'text-slate-500'}`}>{module.hint}</span>
          </button>
        ))}
      </div>

      <CreatePanel domain={domain} rows={rows} disabled={mutating} onSubmit={create} onAction={act} />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div><h2 className="text-xl font-semibold">{active.label}</h2><p className="text-sm text-slate-500">{active.hint}</p></div>
          <button type="button" onClick={() => void load()} disabled={loading || mutating} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50">Actualiser</button>
        </div>
        {loading ? <p className="text-sm text-slate-500">Chargement…</p> : null}
        {notice ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}
        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {!loading && !error && rows.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Aucun dossier pour ce périmètre.</p> : null}
        {rows.length > 0 ? <OperationsTable domain={domain} rows={rows} disabled={mutating} onAction={act} /> : null}
      </section>

      {domain === 'commissions' && (sessions.length > 0 || decisions.length > 0) ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <CompactTable title="Séances" rows={sessions} />
          <CompactTable title="Décisions" rows={decisions} />
        </div>
      ) : null}

      <a href="/admin/season-cycles" className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Ouvrir le cycle réglementaire annuel</a>
    </div>
  )
}

function CreatePanel({ domain, rows, disabled, onSubmit, onAction }: { domain: Domain; rows: Row[]; disabled: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>; onAction: (action: string, body: JsonBody) => Promise<void> }) {
  if (domain === 'insurance') return <InfoPanel>Les assurances sont déposées par les clubs. La fédération les instruit et décide depuis la liste ci-dessous.</InfoPanel>

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Nouvelle opération</h2>
      <p className="mb-4 text-sm text-slate-500">Les identifiants de périmètre sont revalidés côté serveur avant toute écriture.</p>
      {domain === 'commissions' ? <CommissionForms rows={rows} disabled={disabled} onSubmit={onSubmit} onAction={onAction} /> : null}
      {domain === 'grants' ? <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Input name="federationId" label="Fédération ID" required/><Input name="leagueId" label="Ligue ID"/><Input name="seasonId" label="Saison ID"/><Input name="code" label="Code" required/><Input name="name" label="Programme" required/><Input name="totalBudget" label="Budget total" type="number" required/><Input name="currency" label="Devise" placeholder="TND"/><Input name="opensAt" label="Ouverture" type="datetime-local" required/><Input name="closesAt" label="Clôture" type="datetime-local" required/><Submit disabled={disabled}/></form> : null}
      {domain === 'documents' ? <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Input name="federationId" label="Fédération ID" required/><Input name="leagueId" label="Ligue ID"/><Input name="seasonId" label="Saison ID"/><Select name="domain" label="Domaine" values={['CLUB_LICENSE','COMPETITION_ENTRY','FINANCIAL_COMPLIANCE','INSURANCE','GRANT','COACH_LICENSE','STADIUM','GOVERNANCE','OTHER']}/><Input name="code" label="Code" required/><Input name="name" label="Exigence" required/><Select name="appliesTo" label="Cible" values={['CLUB','PERSON','BOTH']}/><Input name="validDays" label="Validité (jours)" type="number"/><Submit disabled={disabled}/></form> : null}
      {domain === 'national-teams' ? <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Input name="federationId" label="Fédération ID" required/><Input name="code" label="Code" required/><Input name="name" label="Nom" required/><Input name="ageCategory" label="Catégorie" required/><Select name="gender" label="Genre" values={['MALE','FEMALE','MIXED']}/><Select name="discipline" label="Discipline" values={['FOOTBALL','FUTSAL','BEACH_SOCCER']}/><Submit disabled={disabled}/></form> : null}
      {domain === 'broadcasting' ? <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3 md:grid-cols-2"><Input name="federationId" label="Fédération ID" required/><Input name="leagueId" label="Ligue ID"/><Input name="seasonId" label="Saison ID" required/><Input name="competitionId" label="Compétition ID"/><Input name="name" label="Distribution" required/><Input name="grossAmount" label="Montant brut" type="number" required/><Input name="currency" label="Devise" placeholder="TND"/><JsonArea name="allocations" label="Allocations JSON" placeholder='[{"clubId":"…","fixedAmount":1000,"performanceAmount":0,"broadcastAmount":0,"bonusAmount":0,"deductions":0}]'/><Submit disabled={disabled}/></form> : null}
      {domain === 'training-compensation' ? <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3 md:grid-cols-2"><Input name="federationId" label="Fédération ID" required/><Input name="leagueId" label="Ligue ID"/><Input name="seasonId" label="Saison ID"/><Input name="playerId" label="Joueur ID" required/><Input name="liableClubId" label="Club redevable ID" required/><Select name="triggeringEvent" label="Événement" values={['FIRST_PRO_CONTRACT','DOMESTIC_TRANSFER','OTHER']}/><Input name="baseAmount" label="Montant de référence" type="number" required/><Input name="currency" label="Devise" placeholder="TND"/><JsonArea name="beneficiaries" label="Clubs formateurs JSON" placeholder='[{"clubId":"…","trainingStart":"2020-01-01","trainingEnd":"2022-01-01","seasonsCount":2,"allocationRate":0.5,"amount":1000}]'/><Submit disabled={disabled}/></form> : null}
      {domain === 'solidarity' ? <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3 md:grid-cols-2"><Input name="federationId" label="Fédération ID" required/><Input name="leagueId" label="Ligue ID"/><Input name="seasonId" label="Saison ID"/><Input name="playerId" label="Joueur ID" required/><Input name="triggeringClubId" label="Club déclencheur ID" required/><Input name="receivingClubId" label="Club receveur ID" required/><Input name="transferAmount" label="Montant de référence" type="number" required/><Input name="contributionRate" label="Taux (0-1)" type="number" step="0.00001" required/><JsonArea name="allocations" label="Répartition JSON" placeholder='[{"clubId":"…","trainingStart":"2020-01-01","trainingEnd":"2022-01-01","allocationRate":0.5,"amount":1000}]'/><Submit disabled={disabled}/></form> : null}
    </section>
  )
}

function CommissionForms({ rows, disabled, onSubmit, onAction }: { rows: Row[]; disabled: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>; onAction: (action: string, body: JsonBody) => Promise<void> }) {
  return <div className="space-y-4">
    <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Input name="federationId" label="Fédération ID" required/><Input name="leagueId" label="Ligue ID"/><Input name="code" label="Code" required/><Input name="name" label="Nom" required/><Select name="commissionType" label="Type" values={['DISCIPLINE','APPEALS','LEGAL_DISPUTES','CLUB_LICENSING','FINANCIAL_CONTROL','COMPETITIONS','OTHER']}/><Select name="quorumRule" label="Quorum" values={['ABSOLUTE_MAJORITY','TWO_THIRDS','FIXED']}/><Input name="fixedQuorum" label="Quorum fixe" type="number"/><Submit disabled={disabled}/></form>
    {rows.length > 0 ? <form onSubmit={(event) => { event.preventDefault(); const body = formBody(event.currentTarget); void onAction('session', body) }} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><SelectRows name="commissionId" label="Commission" rows={rows}/><Input name="title" label="Objet de la séance" required/><Input name="scheduledAt" label="Date de séance" type="datetime-local" required/><Input name="seasonId" label="Saison ID"/><Submit disabled={disabled} label="Créer la séance"/></form> : null}
  </div>
}

function OperationsTable({ domain, rows, disabled, onAction }: { domain: Domain; rows: Row[]; disabled: boolean; onAction: (action: string, body: JsonBody) => Promise<void> }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Référence</th><th className="px-3 py-2">Libellé</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Périmètre</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{rows.map((row, index) => <tr key={text(row, ['id']) + index} className="border-b last:border-0"><td className="px-3 py-3 font-medium">{text(row, ['decision_number', 'reference_number', 'policy_number', 'code', 'id'])}</td><td className="px-3 py-3">{text(row, ['name', 'title', 'summary', 'provider', 'purpose'])}</td><td className="px-3 py-3">{text(row, ['status'])}</td><td className="px-3 py-3 text-slate-500">{text(row, ['league_id', 'federation_id', 'season_id'])}</td><td className="px-3 py-3"><RowActions domain={domain} row={row} disabled={disabled} onAction={onAction}/></td></tr>)}</tbody></table></div>
}

function RowActions({ domain, row, disabled, onAction }: { domain: Domain; row: Row; disabled: boolean; onAction: (action: string, body: JsonBody) => Promise<void> }) {
  const id = String(row.id ?? '')
  const status = String(row.status ?? '')
  const button = (label: string, action: string, body: JsonBody) => <button type="button" disabled={disabled} onClick={() => void onAction(action, body)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium disabled:opacity-50">{label}</button>
  return <div className="flex justify-end gap-2">
    {domain === 'insurance' && status === 'SUBMITTED' ? button('Instruire', 'transition', { id, policyScope: row.policy_scope === 'PERSON' ? 'PERSON' : 'CLUB', targetStatus: 'UNDER_REVIEW' }) : null}
    {domain === 'insurance' && status === 'UNDER_REVIEW' ? <>{button('Approuver', 'transition', { id, policyScope: row.policy_scope === 'PERSON' ? 'PERSON' : 'CLUB', targetStatus: 'ACTIVE' })}{button('Rejeter', 'transition', { id, policyScope: row.policy_scope === 'PERSON' ? 'PERSON' : 'CLUB', targetStatus: 'REJECTED' })}</> : null}
    {domain === 'grants' && status === 'DRAFT' ? button('Ouvrir', 'campaign-transition', { id, targetStatus: 'OPEN' }) : null}
    {domain === 'grants' && status === 'OPEN' ? button('Clôturer', 'campaign-transition', { id, targetStatus: 'CLOSED' }) : null}
    {domain === 'grants' && status === 'CLOSED' ? button('Archiver', 'campaign-transition', { id, targetStatus: 'ARCHIVED' }) : null}
    {domain === 'broadcasting' && status === 'CALCULATED' ? button('Approuver', 'approve', { id }) : null}
    {domain === 'training-compensation' && ['CALCULATED', 'UNDER_REVIEW'].includes(status) ? button('Décider', 'decision', { id }) : null}
    {domain === 'solidarity' && ['CALCULATED', 'UNDER_REVIEW'].includes(status) ? button('Décider', 'decision', { id }) : null}
  </div>
}

function CompactTable({ title, rows }: { title: string; rows: Row[] }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-3 font-semibold">{title}</h2><div className="space-y-2">{rows.map((row, index) => <div key={text(row, ['id']) + index} className="rounded-lg bg-slate-50 p-3 text-sm"><span className="font-medium">{text(row, ['decision_number','title','id'])}</span><span className="ml-2 text-slate-500">{text(row, ['status','source_type'])}</span></div>)}</div></section>
}

function Input({ name, label, type = 'text', required = false, placeholder, step }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string; step?: string }) {
  return <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span><input name={name} type={type} required={required} placeholder={placeholder} step={step} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"/></label>
}

function Select({ name, label, values }: { name: string; label: string; values: string[] }) {
  return <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span><select name={name} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">{values.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
}

function SelectRows({ name, label, rows }: { name: string; label: string; rows: Row[] }) {
  return <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span><select name={name} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">{rows.map((row) => <option key={String(row.id)} value={String(row.id)}>{text(row, ['name','code','id'])}</option>)}</select></label>
}

function JsonArea({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return <label className="text-sm md:col-span-2"><span className="mb-1 block font-medium text-slate-700">{label}</span><textarea name={name} required rows={4} placeholder={placeholder} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs"/></label>
}

function Submit({ disabled, label = 'Créer' }: { disabled: boolean; label?: string }) {
  return <div className="flex items-end"><button type="submit" disabled={disabled} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{label}</button></div>
}

function InfoPanel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{children}</div>
}
