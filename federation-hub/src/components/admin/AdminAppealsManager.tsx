'use client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
type AppealItem = { id: string; sourceType: string; sourceId: string; applicantType: string; applicantName: string; grounds: string; status: string; submittedAt: string; decisionSummary?: string | null }
type Doc = { id: string; fileUrl: string; fileName: string }
type EventItem = { id: string; action: string; actorRole: string; reason?: string | null; createdAt: string }
type Bundle = { appeal: AppealItem; documents: Doc[]; events: EventItem[] }
const STATUSES = ['SUBMITTED', 'ADMISSIBILITY_REVIEW', 'UNDER_REVIEW', 'HEARING', 'DECIDED', 'REJECTED', 'WITHDRAWN']
const TEXT = {
  fr: { title: 'Appels', subtitle: 'Instance d’appel : les décisions déjà rendues restent inchangées dans leur historique.', all: 'Tous', status: 'Statut', applicant: 'Requérant', source: 'Décision contestée', open: 'Détail', loading: 'Chargement…', empty: 'Aucun appel.', startAdmissibility: 'Examiner la recevabilité', declareInadmissible: 'Déclarer irrecevable', accept: 'Accepter (instruction)', hear: 'Passer en audience', decide: 'Rendre une décision', reasonRequired: 'Motif obligatoire', summary: 'Résumé de la décision', close: 'Fermer', history: 'Historique', grounds: 'Motifs' },
  en: { title: 'Appeals', subtitle: 'Appeal instance: decisions already issued keep their history unchanged.', all: 'All', status: 'Status', applicant: 'Applicant', source: 'Contested decision', open: 'Detail', loading: 'Loading…', empty: 'No appeal.', startAdmissibility: 'Review admissibility', declareInadmissible: 'Declare inadmissible', accept: 'Accept (review)', hear: 'Move to hearing', decide: 'Issue a decision', reasonRequired: 'Reason required', summary: 'Decision summary', close: 'Close', history: 'History', grounds: 'Grounds' },
  ar: { title: 'الطعون', subtitle: 'هيئة الطعن: القرارات الصادرة تبقى دون تغيير في سجلها.', all: 'الكل', status: 'الحالة', applicant: 'الطاعن', source: 'القرار المطعون فيه', open: 'التفاصيل', loading: 'جار التحميل…', empty: 'لا يوجد طعن.', startAdmissibility: 'فحص القبول', declareInadmissible: 'التصريح بعدم القبول', accept: 'قبول (فحص)', hear: 'الانتقال لجلسة استماع', decide: 'إصدار قرار', reasonRequired: 'السبب إجباري', summary: 'ملخص القرار', close: 'إغلاق', history: 'السجل', grounds: 'الأسباب' },
} as const

export default function AdminAppealsManager() {
  const { locale } = useTranslations(); const text = TEXT[locale]
  const [appeals, setAppeals] = useState<AppealItem[]>([]); const [selected, setSelected] = useState<Bundle | null>(null)
  const [status, setStatus] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null)
  const [deciding, setDeciding] = useState(false); const [decisionSummary, setDecisionSummary] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const query = new URLSearchParams(); if (status) query.set('status', status); const response = await fetch(`/api/admin/appeals?${query}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setAppeals(data) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setLoading(false) }
  }, [status])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])
  async function open(id: string) { const response = await fetch(`/api/admin/appeals/${id}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) return setError(data.error ?? 'Erreur'); setSelected(data) }
  async function action(name: string, payload: Record<string, unknown> = {}) {
    if (!selected) return
    setSaving(true)
    try { const response = await fetch(`/api/admin/appeals/${selected.appeal.id}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setDeciding(false); await Promise.all([load(), open(selected.appeal.id)]) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }
  async function declareInadmissible() { const reason = window.prompt(text.reasonRequired); if (!reason?.trim()) return; await action('declare-inadmissible', { reason }) }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div>
    {error && <div className="alert alert-danger" onClick={() => setError(null)}>{error}</div>}
    <div className="card border-0 shadow-sm"><div className="card-body row g-2"><div className="col-md-3"><label className="form-label">{text.status}</label><select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{text.all}</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div></div></div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="p-4">{text.loading}</p> : appeals.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.applicant}</th><th>{text.source}</th><th>{text.status}</th><th /></tr></thead><tbody>{appeals.map((item) => <tr key={item.id}><td>{item.applicantName}</td><td>{item.sourceType}</td><td><span className="badge bg-secondary">{item.status}</span></td><td><button className="btn btn-sm btn-outline-primary" onClick={() => void open(item.id)}>{text.open}</button></td></tr>)}</tbody></table></div>}</div></div>
    {selected && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{selected.appeal.applicantName} · {selected.appeal.sourceType}</strong><button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      <div><strong>{text.grounds}:</strong> {selected.appeal.grounds}</div>
      {selected.appeal.decisionSummary && <div className="alert alert-info"><strong>{text.summary}:</strong> {selected.appeal.decisionSummary}</div>}
      <div className="d-flex gap-2 flex-wrap">
        {selected.appeal.status === 'SUBMITTED' && <button disabled={saving} className="btn btn-outline-primary" onClick={() => void action('start-admissibility')}>{text.startAdmissibility}</button>}
        {selected.appeal.status === 'ADMISSIBILITY_REVIEW' && <><button disabled={saving} className="btn btn-outline-danger" onClick={() => void declareInadmissible()}>{text.declareInadmissible}</button><button disabled={saving} className="btn btn-success" onClick={() => void action('accept')}>{text.accept}</button></>}
        {selected.appeal.status === 'UNDER_REVIEW' && <><button disabled={saving} className="btn btn-outline-primary" onClick={() => void action('hear')}>{text.hear}</button><button disabled={saving} className="btn btn-success" onClick={() => setDeciding(true)}>{text.decide}</button></>}
        {selected.appeal.status === 'HEARING' && <button disabled={saving} className="btn btn-success" onClick={() => setDeciding(true)}>{text.decide}</button>}
      </div>
      {deciding && <div className="border rounded p-3 d-flex flex-column gap-2"><textarea className="form-control" placeholder={text.summary} value={decisionSummary} onChange={(e) => setDecisionSummary(e.target.value)} /><div className="d-flex gap-2"><button disabled={saving} className="btn btn-primary btn-sm" onClick={() => void action('decide', { decisionSummary })}>{text.summary}</button><button className="btn btn-outline-secondary btn-sm" onClick={() => setDeciding(false)}>{text.close}</button></div></div>}
      <div>{selected.documents.map((item) => <div key={item.id}><a href={item.fileUrl} target="_blank" rel="noreferrer">{item.fileName}</a></div>)}</div>
      <div><h2 className="h6">{text.history}</h2>{selected.events.map((item) => <div key={item.id} className="border-top py-2"><strong>{item.action}</strong> · {item.actorRole}{item.reason ? ` · ${item.reason}` : ''}</div>)}</div>
    </div></div>}
  </div>
}
