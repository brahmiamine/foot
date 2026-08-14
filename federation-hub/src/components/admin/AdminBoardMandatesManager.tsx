'use client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
type Mandate = { id: string; clubName: string; status: string; startsAt: string; endsAt: string; electionDocumentUrl?: string | null; rejectionReason?: string | null }
type Member = { id: string; personName: string; role: string; federationApproved: boolean; startsAt: string; endsAt?: string | null }
type HistoryItem = { id: string; action: string; actorRole: string; reason?: string | null; createdAt: string }
type Bundle = { mandate: Mandate; members: Member[]; history: HistoryItem[] }
const STATUSES = ['DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED', 'ENDED']
const TEXT = {
  fr: { title: 'Gouvernance des clubs', subtitle: 'Comités directeurs : validation fédérale des mandats et des membres.', all: 'Tous', status: 'Statut', club: 'Club', period: 'Mandat', open: 'Détail', loading: 'Chargement…', empty: 'Aucun mandat.', validate: 'Valider', reject: 'Rejeter', end: 'Clore', reasonRequired: 'Motif obligatoire', members: 'Membres du comité', approve: 'Approuver', approved: 'Approuvé', pending: 'En attente', close: 'Fermer', history: 'Historique' },
  en: { title: 'Club governance', subtitle: 'Boards: federal validation of mandates and members.', all: 'All', status: 'Status', club: 'Club', period: 'Mandate', open: 'Detail', loading: 'Loading…', empty: 'No mandate.', validate: 'Validate', reject: 'Reject', end: 'End', reasonRequired: 'Reason required', members: 'Board members', approve: 'Approve', approved: 'Approved', pending: 'Pending', close: 'Close', history: 'History' },
  ar: { title: 'حوكمة الأندية', subtitle: 'المكاتب المديرة: مصادقة فدرالية على العهدات والأعضاء.', all: 'الكل', status: 'الحالة', club: 'النادي', period: 'العهدة', open: 'التفاصيل', loading: 'جار التحميل…', empty: 'لا توجد عهدة.', validate: 'مصادقة', reject: 'رفض', end: 'إنهاء', reasonRequired: 'السبب إجباري', members: 'أعضاء المكتب', approve: 'موافقة', approved: 'تمت الموافقة', pending: 'قيد الانتظار', close: 'إغلاق', history: 'السجل' },
} as const

export default function AdminBoardMandatesManager() {
  const { locale } = useTranslations(); const text = TEXT[locale]
  const [mandates, setMandates] = useState<Mandate[]>([]); const [selected, setSelected] = useState<Bundle | null>(null)
  const [status, setStatus] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const query = new URLSearchParams(); if (status) query.set('status', status); const response = await fetch(`/api/admin/board-mandates?${query}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setMandates(data) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setLoading(false) }
  }, [status])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])
  async function open(id: string) { const response = await fetch(`/api/admin/board-mandates/${id}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) return setError(data.error ?? 'Erreur'); setSelected(data) }
  async function action(name: string) {
    if (!selected) return
    const payload: { reason?: string } = {}
    if (name === 'reject') { const reason = window.prompt(text.reasonRequired); if (!reason?.trim()) return; payload.reason = reason }
    setSaving(true)
    try { const response = await fetch(`/api/admin/board-mandates/${selected.mandate.id}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); await Promise.all([load(), open(selected.mandate.id)]) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }
  async function approveMember(memberId: string) {
    if (!selected) return
    setSaving(true)
    try { const response = await fetch(`/api/admin/board-mandates/${selected.mandate.id}/members/${memberId}/approve`, { method: 'POST' }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); await open(selected.mandate.id) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div>
    {error && <div className="alert alert-danger" onClick={() => setError(null)}>{error}</div>}
    <div className="card border-0 shadow-sm"><div className="card-body row g-2"><div className="col-md-3"><label className="form-label">{text.status}</label><select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{text.all}</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div></div></div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="p-4">{text.loading}</p> : mandates.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.club}</th><th>{text.period}</th><th>{text.status}</th><th /></tr></thead><tbody>{mandates.map((item) => <tr key={item.id}><td>{item.clubName}</td><td>{new Date(item.startsAt).toLocaleDateString()} — {new Date(item.endsAt).toLocaleDateString()}</td><td><span className="badge bg-secondary">{item.status}</span></td><td><button className="btn btn-sm btn-outline-primary" onClick={() => void open(item.id)}>{text.open}</button></td></tr>)}</tbody></table></div>}</div></div>
    {selected && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{selected.mandate.clubName}</strong><button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      {selected.mandate.rejectionReason && <div className="alert alert-warning">{selected.mandate.rejectionReason}</div>}
      <div className="d-flex gap-2">
        {selected.mandate.status === 'SUBMITTED' && <><button disabled={saving} className="btn btn-success" onClick={() => void action('validate')}>{text.validate}</button><button disabled={saving} className="btn btn-outline-danger" onClick={() => void action('reject')}>{text.reject}</button></>}
        {selected.mandate.status === 'VALIDATED' && <button disabled={saving} className="btn btn-outline-secondary" onClick={() => void action('end')}>{text.end}</button>}
      </div>
      <div><h2 className="h6">{text.members}</h2><div className="table-responsive"><table className="table table-sm mb-0"><tbody>{selected.members.map((member) => <tr key={member.id}><td>{member.personName}</td><td>{member.role}</td><td><span className={`badge ${member.federationApproved ? 'bg-success' : 'bg-secondary'}`}>{member.federationApproved ? text.approved : text.pending}</span></td><td>{!member.federationApproved && <button disabled={saving} className="btn btn-sm btn-outline-primary" onClick={() => void approveMember(member.id)}>{text.approve}</button>}</td></tr>)}</tbody></table></div></div>
      <div><h2 className="h6">{text.history}</h2>{selected.history.map((item) => <div key={item.id} className="border-top py-2"><strong>{item.action}</strong> · {item.actorRole}{item.reason ? ` · ${item.reason}` : ''}</div>)}</div>
    </div></div>}
  </div>
}
