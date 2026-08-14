'use client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
type Qualification = { id: string; clubName: string; staffName: string; qualificationType: string; status: string; licenseNumber?: string | null; expiresAt?: string | null; rejectionReason?: string | null }
type HistoryItem = { id: string; action: string; actorRole: string; reason?: string | null; createdAt: string }
type Bundle = { qualification: Qualification; history: HistoryItem[] }
const STATUSES = ['PENDING', 'VALID', 'EXPIRED', 'SUSPENDED', 'REVOKED']
const TEXT = {
  fr: { title: 'Qualifications entraîneurs', subtitle: 'Validation fédérale des diplômes techniques (CAF).', all: 'Tous', status: 'Statut', club: 'Club', staff: 'Entraîneur', type: 'Niveau', open: 'Détail', loading: 'Chargement…', empty: 'Aucune qualification.', validate: 'Valider', suspend: 'Suspendre', reactivate: 'Réactiver', revoke: 'Révoquer', reasonRequired: 'Motif obligatoire', licenseNumber: 'Numéro de licence', expiresAt: 'Expire le', close: 'Fermer', history: 'Historique' },
  en: { title: 'Coach qualifications', subtitle: 'Federal validation of technical diplomas (CAF).', all: 'All', status: 'Status', club: 'Club', staff: 'Coach', type: 'Level', open: 'Detail', loading: 'Loading…', empty: 'No qualification.', validate: 'Validate', suspend: 'Suspend', reactivate: 'Reactivate', revoke: 'Revoke', reasonRequired: 'Reason required', licenseNumber: 'License number', expiresAt: 'Expires on', close: 'Close', history: 'History' },
  ar: { title: 'تأهيل المدربين', subtitle: 'مصادقة فدرالية على الشهادات الفنية (CAF).', all: 'الكل', status: 'الحالة', club: 'النادي', staff: 'المدرب', type: 'المستوى', open: 'التفاصيل', loading: 'جار التحميل…', empty: 'لا يوجد تأهيل.', validate: 'مصادقة', suspend: 'تعليق', reactivate: 'إعادة تفعيل', revoke: 'سحب', reasonRequired: 'السبب إجباري', licenseNumber: 'رقم الرخصة', expiresAt: 'تاريخ الانتهاء', close: 'إغلاق', history: 'السجل' },
} as const

export default function AdminCoachQualificationsManager() {
  const { locale } = useTranslations(); const text = TEXT[locale]
  const [items, setItems] = useState<Qualification[]>([]); const [selected, setSelected] = useState<Bundle | null>(null)
  const [status, setStatus] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false); const [validateForm, setValidateForm] = useState({ licenseNumber: '', expiresAt: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try { const query = new URLSearchParams(); if (status) query.set('status', status); const response = await fetch(`/api/admin/coach-licenses?${query}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setItems(data) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setLoading(false) }
  }, [status])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])
  async function open(id: string) { const response = await fetch(`/api/admin/coach-licenses/${id}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) return setError(data.error ?? 'Erreur'); setSelected(data) }
  async function action(name: string, payload: Record<string, unknown> = {}) {
    if (!selected) return
    setSaving(true)
    try { const response = await fetch(`/api/admin/coach-licenses/${selected.qualification.id}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setValidating(false); await Promise.all([load(), open(selected.qualification.id)]) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }
  async function revoke() { const reason = window.prompt(text.reasonRequired); if (!reason?.trim()) return; await action('revoke', { reason }) }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div>
    {error && <div className="alert alert-danger" onClick={() => setError(null)}>{error}</div>}
    <div className="card border-0 shadow-sm"><div className="card-body row g-2"><div className="col-md-3"><label className="form-label">{text.status}</label><select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{text.all}</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div></div></div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="p-4">{text.loading}</p> : items.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.staff}</th><th>{text.club}</th><th>{text.type}</th><th>{text.status}</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.staffName}</td><td>{item.clubName}</td><td>{item.qualificationType}</td><td><span className="badge bg-secondary">{item.status}</span></td><td><button className="btn btn-sm btn-outline-primary" onClick={() => void open(item.id)}>{text.open}</button></td></tr>)}</tbody></table></div>}</div></div>
    {selected && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{selected.qualification.staffName} · {selected.qualification.qualificationType}</strong><button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      {selected.qualification.rejectionReason && <div className="alert alert-warning">{selected.qualification.rejectionReason}</div>}
      {selected.qualification.status === 'PENDING' && (validating ? <div className="border rounded p-3 d-flex flex-column gap-2"><label className="form-label">{text.licenseNumber}</label><input className="form-control" value={validateForm.licenseNumber} onChange={(e) => setValidateForm({ ...validateForm, licenseNumber: e.target.value })} /><label className="form-label">{text.expiresAt}</label><input type="date" className="form-control" value={validateForm.expiresAt} onChange={(e) => setValidateForm({ ...validateForm, expiresAt: e.target.value })} /><button disabled={saving} className="btn btn-success align-self-start" onClick={() => void action('validate', validateForm)}>{text.validate}</button></div> : <button className="btn btn-success align-self-start" onClick={() => setValidating(true)}>{text.validate}</button>)}
      <div className="d-flex gap-2">
        {selected.qualification.status === 'VALID' && <button disabled={saving} className="btn btn-outline-warning" onClick={() => void action('suspend')}>{text.suspend}</button>}
        {selected.qualification.status === 'SUSPENDED' && <button disabled={saving} className="btn btn-outline-primary" onClick={() => void action('reactivate')}>{text.reactivate}</button>}
        {(selected.qualification.status === 'PENDING' || selected.qualification.status === 'VALID' || selected.qualification.status === 'SUSPENDED') && <button disabled={saving} className="btn btn-outline-danger" onClick={() => void revoke()}>{text.revoke}</button>}
      </div>
      <div><h2 className="h6">{text.history}</h2>{selected.history.map((item) => <div key={item.id} className="border-top py-2"><strong>{item.action}</strong> · {item.actorRole}{item.reason ? ` · ${item.reason}` : ''}</div>)}</div>
    </div></div>}
  </div>
}
