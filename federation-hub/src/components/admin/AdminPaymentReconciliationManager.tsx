'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import type {
  PaymentReconciliationBundle,
  PaymentReconciliationCase,
  PaymentReconciliationResolutionAction,
} from '@/lib/paymentReconciliationClient'

const TEXT = {
  fr: {
    title: 'Réconciliation des paiements',
    subtitle: 'File des écarts entre Payments et les preuves disponibles chez le fournisseur.',
    open: 'Ouverts', resolved: 'Résolus', allProviders: 'Tous les providers', provider: 'Provider', app: 'Application',
    discrepancy: 'Écart', internal: 'Interne', external: 'Preuve provider', checked: 'Dernier contrôle', checks: 'Contrôles',
    detail: 'Détail', recheck: 'Recontrôler', scan: 'Scanner les paiements en attente', loading: 'Chargement…', empty: 'Aucun écart.',
    acceptInternal: "Accepter l'état interne", documentException: 'Documenter une exception', note: 'Motif obligatoire (minimum 3 caractères)',
    history: 'Historique audit', actor: 'Acteur', evidence: 'Source de preuve', close: 'Fermer', refresh: 'Actualiser',
  },
  en: {
    title: 'Payment reconciliation', subtitle: 'Discrepancy queue between Payments and available provider evidence.',
    open: 'Open', resolved: 'Resolved', allProviders: 'All providers', provider: 'Provider', app: 'Application',
    discrepancy: 'Discrepancy', internal: 'Internal', external: 'Provider evidence', checked: 'Last checked', checks: 'Checks',
    detail: 'Detail', recheck: 'Recheck', scan: 'Scan stale payments', loading: 'Loading…', empty: 'No discrepancy.',
    acceptInternal: 'Accept internal state', documentException: 'Document exception', note: 'Required reason (minimum 3 characters)',
    history: 'Audit history', actor: 'Actor', evidence: 'Evidence source', close: 'Close', refresh: 'Refresh',
  },
  ar: {
    title: 'مطابقة المدفوعات', subtitle: 'قائمة الفروقات بين نظام المدفوعات والأدلة المتاحة لدى مزود الدفع.',
    open: 'مفتوحة', resolved: 'تم حلها', allProviders: 'كل المزودين', provider: 'المزود', app: 'التطبيق',
    discrepancy: 'الفرق', internal: 'الحالة الداخلية', external: 'دليل المزود', checked: 'آخر تحقق', checks: 'مرات التحقق',
    detail: 'التفاصيل', recheck: 'إعادة التحقق', scan: 'فحص المدفوعات المعلقة', loading: 'جار التحميل…', empty: 'لا توجد فروقات.',
    acceptInternal: 'اعتماد الحالة الداخلية', documentException: 'توثيق استثناء', note: 'السبب إجباري (3 أحرف على الأقل)',
    history: 'سجل التدقيق', actor: 'الفاعل', evidence: 'مصدر الدليل', close: 'إغلاق', refresh: 'تحديث',
  },
} as const

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-GB' : 'fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function discrepancyBadge(value: PaymentReconciliationCase['discrepancyType']): string {
  if (value === 'STATUS_MISMATCH' || value === 'MISSING_PROVIDER_REFERENCE') return 'bg-danger'
  if (value === 'PROVIDER_CHECK_FAILED') return 'bg-warning text-dark'
  if (value === 'PROVIDER_EVIDENCE_UNAVAILABLE') return 'bg-info text-dark'
  return 'bg-secondary'
}

export default function AdminPaymentReconciliationManager() {
  const { locale } = useTranslations()
  const text = TEXT[locale]
  const [cases, setCases] = useState<PaymentReconciliationCase[]>([])
  const [selected, setSelected] = useState<PaymentReconciliationBundle | null>(null)
  const [status, setStatus] = useState<'OPEN' | 'RESOLVED'>('OPEN')
  const [provider, setProvider] = useState('')
  const [consumerApplication, setConsumerApplication] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applications = useMemo(
    () => [...new Set(cases.map((item) => item.consumerApplication).filter(Boolean) as string[])].sort(),
    [cases],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams({ status })
      if (provider) query.set('provider', provider)
      if (consumerApplication) query.set('consumerApplication', consumerApplication)
      const response = await fetch(`/api/admin/payments/reconciliation?${query}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setCases(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [consumerApplication, provider, status])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function openCase(id: string) {
    setError(null)
    const response = await fetch(`/api/admin/payments/reconciliation/${encodeURIComponent(id)}`, { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) return setError(data.error ?? 'Erreur')
    setSelected(data)
  }

  async function scan() {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/payments/reconciliation/scan', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function recheck(item: PaymentReconciliationCase) {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/payments/reconciliation/${encodeURIComponent(item.id)}/recheck`,
        { method: 'POST' },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setSelected(data)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function resolve(action: Exclude<PaymentReconciliationResolutionAction, 'AUTO_MATCH'>) {
    if (!selected) return
    const note = window.prompt(text.note)
    if (!note?.trim() || note.trim().length < 3) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/payments/reconciliation/${encodeURIComponent(selected.reconciliationCase.id)}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, note: note.trim() }),
        },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      await Promise.all([load(), openCase(selected.reconciliationCase.id)])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-fluid px-0 d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" disabled={saving} onClick={() => void load()}>{text.refresh}</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => void scan()}>{text.scan}</button>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-0" onClick={() => setError(null)}>{error}</div>}

      <div className="card border-0 shadow-sm"><div className="card-body row g-3 align-items-end">
        <div className="col-md-3"><label className="form-label">Statut</label><select className="form-select" value={status} onChange={(event) => setStatus(event.target.value as 'OPEN' | 'RESOLVED')}><option value="OPEN">{text.open}</option><option value="RESOLVED">{text.resolved}</option></select></div>
        <div className="col-md-3"><label className="form-label">{text.provider}</label><select className="form-select" value={provider} onChange={(event) => setProvider(event.target.value)}><option value="">{text.allProviders}</option><option value="konnect">Konnect</option><option value="paymee">Paymee</option><option value="flouci">Flouci</option></select></div>
        <div className="col-md-4"><label className="form-label">{text.app}</label><select className="form-select" value={consumerApplication} onChange={(event) => setConsumerApplication(event.target.value)}><option value="">—</option>{applications.map((application) => <option key={application} value={application}>{application}</option>)}</select></div>
      </div></div>

      <div className="card border-0 shadow-sm"><div className="card-body p-0">
        {loading ? <p className="p-4 mb-0">{text.loading}</p> : cases.length === 0 ? <p className="p-4 text-muted mb-0">{text.empty}</p> : (
          <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Payment</th><th>{text.provider}</th><th>{text.app}</th><th>{text.discrepancy}</th><th>{text.internal}</th><th>{text.external}</th><th>{text.checked}</th><th /></tr></thead><tbody>
            {cases.map((item) => <tr key={item.id}><td><code>{item.paymentId.slice(0, 8)}</code></td><td>{item.provider}</td><td>{item.consumerApplication ?? '—'}</td><td><span className={`badge ${discrepancyBadge(item.discrepancyType)}`}>{item.discrepancyType}</span></td><td>{item.internalStatus}</td><td>{item.providerStatus ?? '—'}{item.mappedProviderStatus ? ` → ${item.mappedProviderStatus}` : ''}</td><td>{formatDate(item.lastCheckedAt, locale)} · {text.checks}: {item.checkCount}</td><td><div className="d-flex gap-2"><button className="btn btn-sm btn-outline-primary" onClick={() => void openCase(item.id)}>{text.detail}</button>{item.status === 'OPEN' && <button disabled={saving} className="btn btn-sm btn-outline-secondary" onClick={() => void recheck(item)}>{text.recheck}</button>}</div></td></tr>)}
          </tbody></table></div>
        )}
      </div></div>

      {selected && <div className="card border-primary"><div className="card-header d-flex justify-content-between align-items-center"><strong>{selected.reconciliationCase.provider} · {selected.reconciliationCase.paymentId}</strong><button type="button" className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
        <div className="row g-3"><div className="col-md-4"><strong>{text.discrepancy}</strong><div>{selected.reconciliationCase.discrepancyType}</div></div><div className="col-md-4"><strong>{text.evidence}</strong><div>{selected.reconciliationCase.evidenceSource}</div></div><div className="col-md-4"><strong>{text.internal}</strong><div>{selected.reconciliationCase.internalStatus} / {selected.reconciliationCase.providerStatus ?? '—'}</div></div></div>
        {selected.reconciliationCase.detail && <div className="alert alert-light border mb-0">{selected.reconciliationCase.detail}</div>}
        {selected.reconciliationCase.resolutionNote && <div className="alert alert-success mb-0"><strong>{selected.reconciliationCase.resolutionAction}</strong> · {selected.reconciliationCase.resolutionNote}</div>}
        {selected.reconciliationCase.status === 'OPEN' && <div className="d-flex flex-wrap gap-2"><button disabled={saving} className="btn btn-outline-secondary" onClick={() => void recheck(selected.reconciliationCase)}>{text.recheck}</button><button disabled={saving} className="btn btn-success" onClick={() => void resolve('ACCEPT_INTERNAL')}>{text.acceptInternal}</button><button disabled={saving} className="btn btn-outline-warning" onClick={() => void resolve('DOCUMENT_EXCEPTION')}>{text.documentException}</button></div>}
        <div><h2 className="h6">{text.history}</h2>{selected.events.length === 0 ? <p className="text-muted mb-0">—</p> : selected.events.map((event) => <div key={event.id} className="border-top py-2"><div className="d-flex flex-wrap justify-content-between gap-2"><strong>{event.action}</strong><span className="text-muted small">{formatDate(event.createdAt, locale)}</span></div><div className="small">{text.actor}: {event.actorApplication}{event.actorUser ? ` / ${event.actorUser}` : ''}</div>{event.note && <div className="small text-muted">{event.note}</div>}</div>)}</div>
      </div></div>}
    </div>
  )
}
