'use client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
type LegalCase = { id: string; caseNumber: string; category: string; claimantType: string; claimantId: string; claimantName: string; respondentType: string; respondentId: string; respondentName: string; subject: string; status: string; filedAt: string; hearingDate?: string | null; decisionSummary?: string | null; deadline?: string | null }
type Doc = { id: string; fileUrl: string; fileName: string; version: number; submittedByType: string }
type Hearing = { id: string; scheduledAt: string; location?: string | null; mode: string; held: boolean }
type Decision = { id: string; summary: string; amountAwarded?: string | null; currency?: string | null; decidedAt: string }
type EventItem = { id: string; action: string; actorRole: string; reason?: string | null; createdAt: string }
type Bundle = { legalCase: LegalCase; documents: Doc[]; hearings: Hearing[]; decisions: Decision[]; events: EventItem[] }
type Team = { id: string; nom: string }
const CATEGORIES = ['PLAYER_CLUB', 'COACH_CLUB', 'STAFF_CLUB', 'AGENT_PLAYER', 'AGENT_CLUB', 'CLUB_CLUB', 'CONTRACT', 'TRANSFER', 'DISCIPLINARY', 'FINANCIAL', 'OTHER']
const PARTY_TYPES = ['CLUB', 'PLAYER', 'COACH', 'STAFF', 'AGENT', 'FEDERATION', 'OTHER']
const STATUSES = ['FILED', 'ADMISSIBILITY_REVIEW', 'INADMISSIBLE', 'UNDER_REVIEW', 'HEARING_SCHEDULED', 'HEARD', 'DECIDED', 'APPEALED', 'CLOSED', 'WITHDRAWN']
const TEXT = {
  fr: { title: 'Litiges', subtitle: 'Commission juridique fédérale : instruction et décisions.', all: 'Tous', status: 'Statut', category: 'Catégorie', case: 'Dossier', claimant: 'Demandeur', respondent: 'Défendeur', subject: 'Objet', open: 'Détail', loading: 'Chargement…', empty: 'Aucun litige.', create: 'Ouvrir un litige', createTitle: 'Nouveau litige', chooseClub: 'Choisir un club', partyType: 'Type', partyId: 'Identifiant', save: 'Créer', cancel: 'Annuler', reasonRequired: 'Motif obligatoire', startAdmissibility: 'Examiner la recevabilité', declareInadmissible: 'Déclarer irrecevable', accept: 'Accepter (instruction)', scheduleHearing: 'Programmer une audience', hear: 'Marquer entendu', decide: 'Rendre une décision', close: 'Clore', withdraw: 'Retirer', history: 'Historique', documents: 'Pièces', hearings: 'Audiences', decisions: 'Décisions', close2: 'Fermer', summary: 'Résumé de la décision', amount: 'Montant', currency: 'Devise', hearingDate: 'Date d’audience', location: 'Lieu' },
  en: { title: 'Legal cases', subtitle: 'Federal legal commission: review and decisions.', all: 'All', status: 'Status', category: 'Category', case: 'Case', claimant: 'Claimant', respondent: 'Respondent', subject: 'Subject', open: 'Detail', loading: 'Loading…', empty: 'No case.', create: 'Open a case', createTitle: 'New case', chooseClub: 'Choose a club', partyType: 'Type', partyId: 'Identifier', save: 'Create', cancel: 'Cancel', reasonRequired: 'Reason required', startAdmissibility: 'Review admissibility', declareInadmissible: 'Declare inadmissible', accept: 'Accept (review)', scheduleHearing: 'Schedule a hearing', hear: 'Mark heard', decide: 'Issue a decision', close: 'Close', withdraw: 'Withdraw', history: 'History', documents: 'Documents', hearings: 'Hearings', decisions: 'Decisions', close2: 'Close', summary: 'Decision summary', amount: 'Amount', currency: 'Currency', hearingDate: 'Hearing date', location: 'Location' },
  ar: { title: 'النزاعات', subtitle: 'اللجنة القانونية الفدرالية: الفحص والقرارات.', all: 'الكل', status: 'الحالة', category: 'الفئة', case: 'الملف', claimant: 'المدعي', respondent: 'المدعى عليه', subject: 'الموضوع', open: 'التفاصيل', loading: 'جار التحميل…', empty: 'لا توجد نزاعات.', create: 'فتح نزاع', createTitle: 'نزاع جديد', chooseClub: 'اختر ناديا', partyType: 'النوع', partyId: 'المعرف', save: 'إنشاء', cancel: 'إلغاء', reasonRequired: 'السبب إجباري', startAdmissibility: 'فحص القبول', declareInadmissible: 'التصريح بعدم القبول', accept: 'قبول (فحص)', scheduleHearing: 'برمجة جلسة استماع', hear: 'تسجيل الاستماع', decide: 'إصدار قرار', close: 'إغلاق', withdraw: 'سحب', history: 'السجل', documents: 'الوثائق', hearings: 'الجلسات', decisions: 'القرارات', close2: 'إغلاق', summary: 'ملخص القرار', amount: 'المبلغ', currency: 'العملة', hearingDate: 'تاريخ الجلسة', location: 'المكان' },
} as const

export default function AdminLegalCasesManager() {
  const { locale } = useTranslations(); const text = TEXT[locale]
  const [cases, setCases] = useState<LegalCase[]>([]); const [teams, setTeams] = useState<Team[]>([])
  const [selected, setSelected] = useState<Bundle | null>(null); const [status, setStatus] = useState(''); const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false); const [scheduling, setScheduling] = useState(false); const [deciding, setDeciding] = useState(false)
  const [form, setForm] = useState({ category: 'PLAYER_CLUB', claimantType: 'CLUB', claimantId: '', respondentType: 'CLUB', respondentId: '', subject: '', deadline: '' })
  const [hearingForm, setHearingForm] = useState({ scheduledAt: '', location: '' })
  const [decisionForm, setDecisionForm] = useState({ summary: '', amountAwarded: '', currency: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams(); if (status) query.set('status', status); if (category) query.set('category', category)
      const response = await fetch(`/api/admin/legal-cases?${query}`, { cache: 'no-store' })
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setCases(data)
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setLoading(false) }
  }, [status, category])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])
  useEffect(() => { void (async () => { try { const response = await fetch('/api/admin/teams?team_type=club', { cache: 'no-store' }); const data = await response.json(); if (response.ok) setTeams((Array.isArray(data) ? data : data.teams ?? []).map((t: { id: string; nom: string }) => ({ id: t.id, nom: t.nom }))) } catch { /* pas bloquant */ } })() }, [])

  async function open(id: string) { const response = await fetch(`/api/admin/legal-cases/${id}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) return setError(data.error ?? 'Erreur'); setSelected(data) }
  async function action(name: string) {
    if (!selected) return
    const payload: { reason?: string } = {}
    if (name === 'declare-inadmissible' || name === 'withdraw' || name === 'close') { const reason = window.prompt(text.reasonRequired); if (!reason?.trim()) return; payload.reason = reason }
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/legal-cases/${selected.legalCase.id}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur')
      await Promise.all([load(), open(selected.legalCase.id)])
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }
  async function submitCreate() {
    if (!form.claimantId || !form.respondentId || !form.subject.trim()) { setError(text.reasonRequired); return }
    setSaving(true)
    try {
      const response = await fetch('/api/admin/legal-cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, deadline: form.deadline || null }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setCreating(false); setForm({ category: 'PLAYER_CLUB', claimantType: 'CLUB', claimantId: '', respondentType: 'CLUB', respondentId: '', subject: '', deadline: '' }); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }
  async function submitHearing() {
    if (!selected || !hearingForm.scheduledAt) return
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/legal-cases/${selected.legalCase.id}/hearings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(hearingForm) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setScheduling(false); setHearingForm({ scheduledAt: '', location: '' }); await Promise.all([load(), open(selected.legalCase.id)])
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }
  async function submitDecision() {
    if (!selected || !decisionForm.summary.trim()) return
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/legal-cases/${selected.legalCase.id}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...decisionForm, amountAwarded: decisionForm.amountAwarded || null, currency: decisionForm.currency || null }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setDeciding(false); setDecisionForm({ summary: '', amountAwarded: '', currency: '' }); await Promise.all([load(), open(selected.legalCase.id)])
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div className="d-flex justify-content-between align-items-start"><div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div><button className="btn btn-primary" onClick={() => setCreating(true)}>{text.create}</button></div>
    {error && <div className="alert alert-danger" onClick={() => setError(null)}>{error}</div>}
    {creating && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{text.createTitle}</strong><button className="btn-close" aria-label={text.close2} onClick={() => setCreating(false)} /></div><div className="card-body row g-2">
      <div className="col-md-4"><label className="form-label">{text.category}</label><select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label">{text.claimant} · {text.partyType}</label><select className="form-select" value={form.claimantType} onChange={(e) => setForm({ ...form, claimantType: e.target.value, claimantId: '' })}>{PARTY_TYPES.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label">{text.claimant}</label>{form.claimantType === 'CLUB' ? <select className="form-select" value={form.claimantId} onChange={(e) => setForm({ ...form, claimantId: e.target.value })}><option value="">{text.chooseClub}</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}</select> : <input className="form-control" value={form.claimantId} onChange={(e) => setForm({ ...form, claimantId: e.target.value })} />}</div>
      <div className="col-md-4"><label className="form-label">{text.respondent} · {text.partyType}</label><select className="form-select" value={form.respondentType} onChange={(e) => setForm({ ...form, respondentType: e.target.value, respondentId: '' })}>{PARTY_TYPES.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label">{text.respondent}</label>{form.respondentType === 'CLUB' ? <select className="form-select" value={form.respondentId} onChange={(e) => setForm({ ...form, respondentId: e.target.value })}><option value="">{text.chooseClub}</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}</select> : <input className="form-control" value={form.respondentId} onChange={(e) => setForm({ ...form, respondentId: e.target.value })} />}</div>
      <div className="col-12"><label className="form-label">{text.subject}</label><textarea className="form-control" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
      <div className="col-12 d-flex gap-2"><button disabled={saving} className="btn btn-primary" onClick={() => void submitCreate()}>{text.save}</button><button className="btn btn-outline-secondary" onClick={() => setCreating(false)}>{text.cancel}</button></div>
    </div></div>}
    <div className="card border-0 shadow-sm"><div className="card-body row g-2">
      <div className="col-md-3"><label className="form-label">{text.status}</label><select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{text.all}</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="col-md-3"><label className="form-label">{text.category}</label><select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">{text.all}</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></div>
    </div></div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="p-4">{text.loading}</p> : cases.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.case}</th><th>{text.claimant}</th><th>{text.respondent}</th><th>{text.category}</th><th>{text.status}</th><th /></tr></thead><tbody>{cases.map((item) => <tr key={item.id}><td>{item.caseNumber}</td><td>{item.claimantName}</td><td>{item.respondentName}</td><td>{item.category}</td><td><span className="badge bg-secondary">{item.status}</span></td><td><button className="btn btn-sm btn-outline-primary" onClick={() => void open(item.id)}>{text.open}</button></td></tr>)}</tbody></table></div>}</div></div>
    {selected && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{selected.legalCase.caseNumber}</strong><button className="btn-close" aria-label={text.close2} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      <div><strong>{text.subject}:</strong> {selected.legalCase.subject}</div>
      {selected.legalCase.decisionSummary && <div className="alert alert-info"><strong>{text.summary}:</strong> {selected.legalCase.decisionSummary}</div>}
      <div className="d-flex gap-2 flex-wrap">
        {selected.legalCase.status === 'FILED' && <button disabled={saving} className="btn btn-outline-primary" onClick={() => void action('start-admissibility')}>{text.startAdmissibility}</button>}
        {selected.legalCase.status === 'ADMISSIBILITY_REVIEW' && <><button disabled={saving} className="btn btn-outline-danger" onClick={() => void action('declare-inadmissible')}>{text.declareInadmissible}</button><button disabled={saving} className="btn btn-success" onClick={() => void action('accept')}>{text.accept}</button></>}
        {selected.legalCase.status === 'UNDER_REVIEW' && <button disabled={saving} className="btn btn-outline-primary" onClick={() => setScheduling(true)}>{text.scheduleHearing}</button>}
        {selected.legalCase.status === 'HEARING_SCHEDULED' && <button disabled={saving} className="btn btn-outline-primary" onClick={() => void action('hear')}>{text.hear}</button>}
        {(selected.legalCase.status === 'UNDER_REVIEW' || selected.legalCase.status === 'HEARD') && <button disabled={saving} className="btn btn-success" onClick={() => setDeciding(true)}>{text.decide}</button>}
        {selected.legalCase.status === 'DECIDED' && <button disabled={saving} className="btn btn-outline-secondary" onClick={() => void action('close')}>{text.close}</button>}
        {['FILED', 'ADMISSIBILITY_REVIEW', 'UNDER_REVIEW', 'HEARING_SCHEDULED'].includes(selected.legalCase.status) && <button disabled={saving} className="btn btn-outline-danger" onClick={() => void action('withdraw')}>{text.withdraw}</button>}
      </div>
      {scheduling && <div className="border rounded p-3 d-flex flex-column gap-2"><div className="row g-2"><div className="col-md-6"><label className="form-label">{text.hearingDate}</label><input type="datetime-local" className="form-control" value={hearingForm.scheduledAt} onChange={(e) => setHearingForm({ ...hearingForm, scheduledAt: e.target.value })} /></div><div className="col-md-6"><label className="form-label">{text.location}</label><input className="form-control" value={hearingForm.location} onChange={(e) => setHearingForm({ ...hearingForm, location: e.target.value })} /></div></div><div className="d-flex gap-2"><button disabled={saving} className="btn btn-primary btn-sm" onClick={() => void submitHearing()}>{text.save}</button><button className="btn btn-outline-secondary btn-sm" onClick={() => setScheduling(false)}>{text.cancel}</button></div></div>}
      {deciding && <div className="border rounded p-3 d-flex flex-column gap-2"><textarea className="form-control" placeholder={text.summary} value={decisionForm.summary} onChange={(e) => setDecisionForm({ ...decisionForm, summary: e.target.value })} /><div className="row g-2"><div className="col-md-6"><input className="form-control" placeholder={text.amount} value={decisionForm.amountAwarded} onChange={(e) => setDecisionForm({ ...decisionForm, amountAwarded: e.target.value })} /></div><div className="col-md-6"><input className="form-control" placeholder={text.currency} maxLength={3} value={decisionForm.currency} onChange={(e) => setDecisionForm({ ...decisionForm, currency: e.target.value.toUpperCase() })} /></div></div><div className="d-flex gap-2"><button disabled={saving} className="btn btn-primary btn-sm" onClick={() => void submitDecision()}>{text.save}</button><button className="btn btn-outline-secondary btn-sm" onClick={() => setDeciding(false)}>{text.cancel}</button></div></div>}
      <div><h2 className="h6">{text.documents}</h2>{selected.documents.map((item) => <div key={item.id}><a href={item.fileUrl} target="_blank" rel="noreferrer">{item.fileName} · v{item.version}</a> <span className="badge bg-light text-dark">{item.submittedByType}</span></div>)}</div>
      <div><h2 className="h6">{text.hearings}</h2>{selected.hearings.map((item) => <div key={item.id} className="border-top py-2">{new Date(item.scheduledAt).toLocaleString()} · {item.mode}{item.location ? ` · ${item.location}` : ''} {item.held && <span className="badge bg-success">✓</span>}</div>)}</div>
      <div><h2 className="h6">{text.decisions}</h2>{selected.decisions.map((item) => <div key={item.id} className="border-top py-2">{item.summary}{item.amountAwarded ? ` · ${item.amountAwarded} ${item.currency ?? ''}` : ''}</div>)}</div>
      <div><h2 className="h6">{text.history}</h2>{selected.events.map((item) => <div key={item.id} className="border-top py-2"><strong>{item.action}</strong> · {item.actorRole}{item.reason ? ` · ${item.reason}` : ''}</div>)}</div>
    </div></div>}
  </div>
}
