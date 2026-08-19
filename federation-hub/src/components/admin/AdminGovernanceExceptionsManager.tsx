'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

type ExceptionRow = {
  id: string
  federationId: string
  leagueId: string | null
  ruleKey: string
  targetType: string
  targetId: string
  reference: string
  reason: string
  validFrom: string
  validUntil: string
  createdBy: string
  createdAt: string
  revokedAt: string | null
  revokeReason: string | null
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'Chargement impossible')
  return body as T
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'Action impossible')
  return payload as T
}

function statusOf(row: ExceptionRow): string {
  if (row.revokedAt) return 'RÉVOQUÉE'
  const now = Date.now()
  const from = new Date(row.validFrom).getTime()
  const until = new Date(row.validUntil).getTime()
  if (now < from) return 'PLANIFIÉE'
  if (now >= until) return 'EXPIRÉE'
  return 'ACTIVE'
}

export default function AdminGovernanceExceptionsManager() {
  const [federationId, setFederationId] = useState('')
  const [rows, setRows] = useState<ExceptionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const activeCount = useMemo(() => rows.filter((row) => statusOf(row) === 'ACTIVE').length, [rows])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = federationId.trim()
        ? `?federationId=${encodeURIComponent(federationId.trim())}`
        : ''
      setRows(await getJson<ExceptionRow[]>(`/api/admin/governance-exceptions${query}`))
    } catch (caught) {
      setRows([])
      setError(caught instanceof Error ? caught.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [federationId])

  useEffect(() => { void load() }, [load])

  const createException = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMutating(true)
    setError(null)
    setNotice(null)
    try {
      const form = new FormData(event.currentTarget)
      await postJson('/api/admin/governance-exceptions', {
        federationId: String(form.get('federationId') ?? '').trim(),
        leagueId: String(form.get('leagueId') ?? '').trim() || undefined,
        ruleKey: 'REGULATORY_DOCUMENT_REQUIRED',
        targetType: 'GRANT_APPLICATION',
        targetId: String(form.get('targetId') ?? '').trim(),
        reference: String(form.get('reference') ?? '').trim(),
        reason: String(form.get('reason') ?? '').trim(),
        validFrom: String(form.get('validFrom') ?? '').trim() || undefined,
        validUntil: String(form.get('validUntil') ?? '').trim(),
      })
      setNotice('Dérogation enregistrée et auditée.')
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Création impossible')
    } finally {
      setMutating(false)
    }
  }

  const revoke = async (id: string) => {
    const reason = window.prompt('Motif de révocation (obligatoire)')
    if (!reason?.trim()) return
    setMutating(true)
    setError(null)
    setNotice(null)
    try {
      await postJson(`/api/admin/governance-exceptions/${encodeURIComponent(id)}/revoke`, { reason })
      setNotice('Dérogation révoquée et auditée.')
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Révocation impossible')
    } finally {
      setMutating(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">GOV-007 · Exception Center</p>
        <h1 className="text-3xl font-bold text-slate-900">Dérogations et exceptions</h1>
        <p className="max-w-4xl text-sm text-slate-600">
          Toute dérogation est bornée dans le temps, motivée, référencée et auditée. Elle ne contourne qu&apos;une règle et une cible précises ; aucune dérogation globale n&apos;est autorisée.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Filtrer par fédération</span>
            <input value={federationId} onChange={(event) => setFederationId(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" placeholder="optionnel" />
          </label>
          <div className="text-sm text-slate-500">{activeCount} dérogation(s) active(s)</div>
        </div>
      </section>

      {loading ? <p className="text-sm text-slate-500">Chargement…</p> : null}
      {notice ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="mb-3 text-lg font-semibold">Créer une dérogation documentaire de subvention</h2>
        <form onSubmit={(event) => void createException(event)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Input name="federationId" label="Fédération ID" required />
          <Input name="leagueId" label="Ligue ID" />
          <Input name="targetId" label="Demande de subvention ID" required />
          <Input name="reference" label="Exigence documentaire ID" required />
          <Input name="validFrom" label="Début de validité" type="datetime-local" />
          <Input name="validUntil" label="Fin de validité" type="datetime-local" required />
          <label className="text-sm md:col-span-2 xl:col-span-3">
            <span className="mb-1 block font-medium text-slate-700">Motif et référence de décision</span>
            <textarea name="reason" required minLength={3} className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
          </label>
          <button type="submit" disabled={mutating} className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Créer la dérogation</button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Historique</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Règle / cible</th><th className="px-3 py-2">Référence</th><th className="px-3 py-2">Période</th><th className="px-3 py-2">Motif</th><th className="px-3 py-2">Action</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const status = statusOf(row)
                return (
                  <tr key={row.id} className="border-b align-top last:border-0">
                    <td className="px-3 py-3 font-semibold">{status}</td>
                    <td className="px-3 py-3"><div className="font-mono text-xs">{row.ruleKey}</div><div>{row.targetType} · {row.targetId}</div></td>
                    <td className="px-3 py-3 font-mono text-xs">{row.reference}</td>
                    <td className="px-3 py-3 text-xs">{new Date(row.validFrom).toLocaleString()}<br />→ {new Date(row.validUntil).toLocaleString()}</td>
                    <td className="max-w-sm px-3 py-3">{row.reason}{row.revokeReason ? <div className="mt-1 text-red-600">Révocation : {row.revokeReason}</div> : null}</td>
                    <td className="px-3 py-3">{status === 'ACTIVE' || status === 'PLANIFIÉE' ? <button type="button" disabled={mutating} onClick={() => void revoke(row.id)} className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 disabled:opacity-50">Révoquer</button> : '—'}</td>
                  </tr>
                )
              })}
              {!rows.length ? <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Aucune dérogation visible dans votre périmètre.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Input({ name, label, type = 'text', required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input name={name} type={type} required={required} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
    </label>
  )
}
