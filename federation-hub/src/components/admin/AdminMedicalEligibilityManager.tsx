'use client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
type Eligibility = { id: string; clubName: string; playerName: string; status: string; examinationDate: string; expiresAt?: string | null; certificateReference?: string | null }
type HistoryItem = { id: string; action: string; actorRole: string; reason?: string | null; createdAt: string }
type Bundle = { eligibility: Eligibility; history: HistoryItem[] }
const STATUSES = ['PENDING', 'FIT', 'UNFIT', 'EXPIRED', 'SUSPENDED']
const TEXT = {
  fr: { title: 'Aptitude médicale fédérale', subtitle: 'Statut d’aptitude uniquement — aucun diagnostic n’est jamais affiché ici.', all: 'Tous', status: 'Statut', club: 'Club', player: 'Joueur', date: 'Date d’examen', open: 'Détail', loading: 'Chargement…', empty: 'Aucun dossier.', markFit: 'Déclarer apte', markUnfit: 'Déclarer inapte', suspend: 'Suspendre', reactivate: 'Réactiver', expiresAt: 'Expire le', close: 'Fermer', history: 'Historique', certificate: 'Référence certificat' },
  en: { title: 'Federal medical eligibility', subtitle: 'Fitness status only — no diagnostic is ever displayed here.', all: 'All', status: 'Status', club: 'Club', player: 'Player', date: 'Examination date', open: 'Detail', loading: 'Loading…', empty: 'No case.', markFit: 'Mark fit', markUnfit: 'Mark unfit', suspend: 'Suspend', reactivate: 'Reactivate', expiresAt: 'Expires on', close: 'Close', history: 'History', certificate: 'Certificate reference' },
  ar: { title: 'الأهلية الطبية الفدرالية', subtitle: 'حالة الأهلية فقط — لا يظهر أي تشخيص هنا.', all: 'الكل', status: 'الحالة', club: 'النادي', player: 'اللاعب', date: 'تاريخ الفحص', open: 'التفاصيل', loading: 'جار التحميل…', empty: 'لا يوجد ملف.', markFit: 'تصريح باللياقة', markUnfit: 'تصريح بعدم اللياقة', suspend: 'تعليق', reactivate: 'إعادة تفعيل', expiresAt: 'تاريخ الانتهاء', close: 'إغلاق', history: 'السجل', certificate: 'مرجع الشهادة' },
} as const

export default function AdminMedicalEligibilityManager() {
  const { locale } = useTranslations(); const text = TEXT[locale]
  const [items, setItems] = useState<Eligibility[]>([]); const [selected, setSelected] = useState<Bundle | null>(null)
  const [status, setStatus] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const query = new URLSearchParams(); if (status) query.set('status', status); const response = await fetch(`/api/admin/medical-eligibility?${query}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setItems(data) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setLoading(false) }
  }, [status])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])
  async function open(id: string) { const response = await fetch(`/api/admin/medical-eligibility/${id}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) return setError(data.error ?? 'Erreur'); setSelected(data) }
  async function action(name: string, payload: Record<string, unknown> = {}) {
    if (!selected) return
    setSaving(true)
    try { const response = await fetch(`/api/admin/medical-eligibility/${selected.eligibility.id}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); await Promise.all([load(), open(selected.eligibility.id)]) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div>
    {error && <div className="alert alert-danger" onClick={() => setError(null)}>{error}</div>}
    <div className="card border-0 shadow-sm"><div className="card-body row g-2"><div className="col-md-3"><label className="form-label">{text.status}</label><select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{text.all}</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div></div></div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="p-4">{text.loading}</p> : items.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.player}</th><th>{text.club}</th><th>{text.date}</th><th>{text.status}</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.playerName}</td><td>{item.clubName}</td><td>{new Date(item.examinationDate).toLocaleDateString()}</td><td><span className={`badge ${item.status === 'FIT' ? 'bg-success' : item.status === 'UNFIT' ? 'bg-danger' : 'bg-secondary'}`}>{item.status}</span></td><td><button className="btn btn-sm btn-outline-primary" onClick={() => void open(item.id)}>{text.open}</button></td></tr>)}</tbody></table></div>}</div></div>
    {selected && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{selected.eligibility.playerName}</strong><button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      {selected.eligibility.certificateReference && <div><strong>{text.certificate}:</strong> {selected.eligibility.certificateReference}</div>}
      {selected.eligibility.status === 'PENDING' && <div className="border rounded p-3 d-flex flex-column gap-2"><label className="form-label">{text.expiresAt}</label><input type="date" className="form-control" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>}
      <div className="d-flex gap-2 flex-wrap">
        {selected.eligibility.status === 'PENDING' && <><button disabled={saving} className="btn btn-success" onClick={() => void action('mark-fit', { expiresAt: expiresAt || undefined })}>{text.markFit}</button><button disabled={saving} className="btn btn-outline-danger" onClick={() => void action('mark-unfit')}>{text.markUnfit}</button></>}
        {selected.eligibility.status === 'FIT' && <button disabled={saving} className="btn btn-outline-warning" onClick={() => void action('suspend')}>{text.suspend}</button>}
        {selected.eligibility.status === 'SUSPENDED' && <button disabled={saving} className="btn btn-outline-primary" onClick={() => void action('reactivate')}>{text.reactivate}</button>}
      </div>
      <div><h2 className="h6">{text.history}</h2>{selected.history.map((item) => <div key={item.id} className="border-top py-2"><strong>{item.action}</strong> · {item.actorRole}</div>)}</div>
    </div></div>}
  </div>
}
