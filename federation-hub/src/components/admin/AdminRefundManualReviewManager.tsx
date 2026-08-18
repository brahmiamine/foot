'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import type {
  ManualReviewDashboard,
  ManualReviewDashboardItem,
  ManualReviewPolicy,
} from '@/lib/refundOperationsClient'

const CONSUMERS = ['ticketing', 'club-hub', 'marketplace', 'federation-hub']

const TEXT = {
  fr: {
    title: 'Remboursements manuels',
    subtitle: 'SLA, rappels et escalades de la file financière plateforme.',
    total: 'À traiter',
    dueSoon: 'Échéance proche',
    overdue: 'Hors SLA',
    escalated: 'Escaladés',
    consumer: 'Application',
    order: 'Commande',
    amount: 'Montant',
    provider: 'Provider',
    deadline: 'Échéance',
    status: 'SLA',
    reason: 'Motif',
    actions: 'Actions',
    confirm: 'Confirmer remboursé',
    reject: 'Rejeter',
    note: 'Motif / référence opérateur obligatoire',
    empty: 'Aucun remboursement en revue manuelle.',
    loading: 'Chargement…',
    refresh: 'Actualiser',
    policy: 'Policy SLA',
    sla: 'SLA (minutes)',
    reminder: 'Rappel avant échéance (minutes)',
    escalation: 'Escalade après échéance (minutes)',
    save: 'Enregistrer',
    version: 'Version',
    saved: 'Policy enregistrée.',
  },
  en: {
    title: 'Manual refunds',
    subtitle: 'Platform finance queue SLA, reminders and escalations.',
    total: 'To process',
    dueSoon: 'Due soon',
    overdue: 'Over SLA',
    escalated: 'Escalated',
    consumer: 'Application',
    order: 'Order',
    amount: 'Amount',
    provider: 'Provider',
    deadline: 'Deadline',
    status: 'SLA',
    reason: 'Reason',
    actions: 'Actions',
    confirm: 'Confirm refunded',
    reject: 'Reject',
    note: 'Operator reason / reference required',
    empty: 'No refund is under manual review.',
    loading: 'Loading…',
    refresh: 'Refresh',
    policy: 'SLA policy',
    sla: 'SLA (minutes)',
    reminder: 'Reminder before due (minutes)',
    escalation: 'Escalation after due (minutes)',
    save: 'Save',
    version: 'Version',
    saved: 'Policy saved.',
  },
  ar: {
    title: 'الاسترجاعات اليدوية',
    subtitle: 'آجال المعالجة والتذكير والتصعيد لقائمة المالية على مستوى المنصة.',
    total: 'قيد المعالجة',
    dueSoon: 'قريب من الأجل',
    overdue: 'تجاوز الأجل',
    escalated: 'تم التصعيد',
    consumer: 'التطبيق',
    order: 'الطلب',
    amount: 'المبلغ',
    provider: 'مزود الدفع',
    deadline: 'الأجل',
    status: 'الحالة',
    reason: 'السبب',
    actions: 'الإجراءات',
    confirm: 'تأكيد الاسترجاع',
    reject: 'رفض',
    note: 'سبب أو مرجع المشغل إجباري',
    empty: 'لا توجد استرجاعات قيد المراجعة اليدوية.',
    loading: 'جار التحميل…',
    refresh: 'تحديث',
    policy: 'سياسة آجال المعالجة',
    sla: 'الأجل بالدقائق',
    reminder: 'التذكير قبل الأجل بالدقائق',
    escalation: 'التصعيد بعد الأجل بالدقائق',
    save: 'حفظ',
    version: 'الإصدار',
    saved: 'تم حفظ السياسة.',
  },
} as const

function badgeClass(item: ManualReviewDashboardItem): string {
  switch (item.state) {
    case 'ESCALATED':
      return 'bg-danger'
    case 'OVERDUE':
      return 'bg-warning text-dark'
    case 'DUE_SOON':
      return 'bg-info text-dark'
    case 'IN_SLA':
      return 'bg-success'
    default:
      return 'bg-secondary'
  }
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-GB' : 'fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function AdminRefundManualReviewManager() {
  const { locale } = useTranslations()
  const text = TEXT[locale]
  const [dashboard, setDashboard] = useState<ManualReviewDashboard | null>(null)
  const [consumer, setConsumer] = useState(CONSUMERS[0])
  const [policy, setPolicy] = useState<ManualReviewPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/payments/manual-review', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setDashboard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPolicy = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/payments/manual-review/policies/${encodeURIComponent(consumer)}`,
        { cache: 'no-store' },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setPolicy(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }, [consumer])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDashboard(), 0)
    return () => window.clearTimeout(timer)
  }, [loadDashboard])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPolicy(), 0)
    return () => window.clearTimeout(timer)
  }, [loadPolicy])

  async function resolveRefund(item: ManualReviewDashboardItem, action: 'confirm' | 'reject') {
    const note = window.prompt(text.note)
    if (!note?.trim()) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/payments/manual-review/${encodeURIComponent(item.refundId)}/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note }),
        },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function savePolicy() {
    if (!policy) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch(
        `/api/admin/payments/manual-review/policies/${encodeURIComponent(consumer)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slaMinutes: Number(policy.slaMinutes),
            reminderBeforeDueMinutes: Number(policy.reminderBeforeDueMinutes),
            escalationAfterDueMinutes: Number(policy.escalationAfterDueMinutes),
          }),
        },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setPolicy(data)
      setMessage(text.saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const summary = dashboard?.summary

  return (
    <div className="container-fluid px-0 d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
        <div>
          <h1 className="h4 mb-1">{text.title}</h1>
          <p className="text-muted mb-0">{text.subtitle}</p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={() => void loadDashboard()}>
          {text.refresh}
        </button>
      </div>

      {error && <div className="alert alert-danger mb-0" onClick={() => setError(null)}>{error}</div>}
      {message && <div className="alert alert-success mb-0" onClick={() => setMessage(null)}>{message}</div>}

      <div className="row g-3">
        {[
          [text.total, summary?.total ?? 0],
          [text.dueSoon, summary?.dueSoon ?? 0],
          [text.overdue, summary?.overdue ?? 0],
          [text.escalated, summary?.escalated ?? 0],
        ].map(([label, value]) => (
          <div className="col-6 col-xl-3" key={String(label)}>
            <div className="card border-0 shadow-sm h-100"><div className="card-body">
              <div className="text-muted small">{label}</div>
              <div className="fs-3 fw-semibold">{value}</div>
            </div></div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent"><strong>{text.policy}</strong></div>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">{text.consumer}</label>
              <select className="form-select" value={consumer} onChange={(e) => setConsumer(e.target.value)}>
                {CONSUMERS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">{text.sla}</label>
              <input className="form-control" type="number" min={5} value={policy?.slaMinutes ?? ''} onChange={(e) => setPolicy((current) => current ? { ...current, slaMinutes: Number(e.target.value) } : current)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">{text.reminder}</label>
              <input className="form-control" type="number" min={0} value={policy?.reminderBeforeDueMinutes ?? ''} onChange={(e) => setPolicy((current) => current ? { ...current, reminderBeforeDueMinutes: Number(e.target.value) } : current)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">{text.escalation}</label>
              <input className="form-control" type="number" min={0} value={policy?.escalationAfterDueMinutes ?? ''} onChange={(e) => setPolicy((current) => current ? { ...current, escalationAfterDueMinutes: Number(e.target.value) } : current)} />
            </div>
            <div className="col-md-1 d-grid">
              <button className="btn btn-primary" disabled={!policy || saving} onClick={() => void savePolicy()}>{text.save}</button>
            </div>
          </div>
          {policy && <div className="small text-muted mt-2">{text.version}: {policy.version}{policy.source ? ` · ${policy.source}` : ''}</div>}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? <p className="p-4 mb-0">{text.loading}</p> : !dashboard?.items.length ? <p className="p-4 mb-0 text-muted">{text.empty}</p> : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead><tr>
                  <th>{text.consumer}</th><th>{text.order}</th><th>{text.amount}</th><th>{text.provider}</th><th>{text.deadline}</th><th>{text.status}</th><th>{text.reason}</th><th>{text.actions}</th>
                </tr></thead>
                <tbody>
                  {dashboard.items.map((item) => (
                    <tr key={item.refundId}>
                      <td><code>{item.consumerApplication}</code></td>
                      <td><div>{item.orderId ?? '—'}</div><small className="text-muted">{item.refundId.slice(0, 8)}</small></td>
                      <td className="fw-semibold">{item.amount} {item.currency}</td>
                      <td>{item.provider}</td>
                      <td>{formatDate(item.dueAt, locale)}{item.minutesToDue !== null && <div className="small text-muted">{item.minutesToDue} min</div>}</td>
                      <td><span className={`badge ${badgeClass(item)}`}>{item.state}</span></td>
                      <td style={{ minWidth: 220 }}><div>{item.manualReviewReason ?? item.reason}</div><small className="text-muted">v{item.policyVersion ?? 0}</small></td>
                      <td><div className="d-flex gap-2 flex-wrap">
                        <button disabled={saving} className="btn btn-sm btn-success" onClick={() => void resolveRefund(item, 'confirm')}>{text.confirm}</button>
                        <button disabled={saving} className="btn btn-sm btn-outline-danger" onClick={() => void resolveRefund(item, 'reject')}>{text.reject}</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
