'use client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
type Case = { id: string; caseNumber: string; clubName?: string | null; personType?: string | null; personId?: string | null; offenseType: string; description: string; status: string; openedAt: string; hearingDate?: string | null }
type Evidence = { id: string; fileUrl: string; fileName: string; description?: string | null }
type Hearing = { id: string; scheduledAt: string; location?: string | null }
type Decision = { id: string; summary: string; sanctionDescription?: string | null }
type EventItem = { id: string; action: string; actorRole: string; reason?: string | null; createdAt: string }
type Bundle = { case: Case; evidence: Evidence[]; hearings: Hearing[]; decisions: Decision[]; events: EventItem[] }
type Team = { id: string; nom: string }
const STATUSES = ['OPEN', 'UNDER_REVIEW', 'HEARING_SCHEDULED', 'DECIDED', 'APPEALED', 'CLOSED']
const PERSON_TYPES = ['', 'PLAYER', 'COACH', 'STAFF', 'REFEREE', 'AGENT', 'OTHER']
const SANCTION_TYPES = ['TRANSFER_BAN', 'REGISTRATION_BAN', 'COMPETITION_BAN', 'FINE', 'POINT_DEDUCTION', 'MATCH_BEHIND_CLOSED_DOORS', 'STADIUM_SUSPENSION', 'COMPETITION_EXCLUSION', 'WARNING']
const TEXT = {
  fr: { title: 'Discipline fédérale', subtitle: 'Commission de discipline : instruction et décisions, sans remplacer cartons/suspensions existants.', all: 'Tous', status: 'Statut', club: 'Club', case: 'Dossier', offense: 'Infraction', open: 'Détail', loading: 'Chargement…', empty: 'Aucun dossier.', create: 'Ouvrir un dossier', createTitle: 'Nouveau dossier', chooseClub: 'Club (optionnel)', personType: 'Type de personne (optionnel)', personId: 'ID personne (optionnel)', description: 'Description', save: 'Créer', cancel: 'Annuler', startReview: 'Commencer l’examen', scheduleHearing: 'Programmer une audience', decide: 'Rendre une décision', close: 'Clore', evidence: 'Preuves', hearings: 'Audiences', decisions: 'Décisions', history: 'Historique', close2: 'Fermer', summary: 'Résumé', sanctionDescription: 'Description de la sanction', createClubSanction: 'Créer une sanction club liée', sanctionType: 'Type de sanction', reason: 'Motif', startsAt: 'Début' },
  en: { title: 'Federal discipline', subtitle: 'Disciplinary commission: review and decisions, without replacing existing cards/suspensions.', all: 'All', status: 'Status', club: 'Club', case: 'Case', offense: 'Offense', open: 'Detail', loading: 'Loading…', empty: 'No case.', create: 'Open a case', createTitle: 'New case', chooseClub: 'Club (optional)', personType: 'Person type (optional)', personId: 'Person ID (optional)', description: 'Description', save: 'Create', cancel: 'Cancel', startReview: 'Start review', scheduleHearing: 'Schedule a hearing', decide: 'Issue a decision', close: 'Close', evidence: 'Evidence', hearings: 'Hearings', decisions: 'Decisions', history: 'History', close2: 'Close', summary: 'Summary', sanctionDescription: 'Sanction description', createClubSanction: 'Create a linked club sanction', sanctionType: 'Sanction type', reason: 'Reason', startsAt: 'Start' },
  ar: { title: 'الانضباط الفدرالي', subtitle: 'لجنة الانضباط: الفحص والقرارات، دون استبدال البطاقات والإيقافات الحالية.', all: 'الكل', status: 'الحالة', club: 'النادي', case: 'الملف', offense: 'المخالفة', open: 'التفاصيل', loading: 'جار التحميل…', empty: 'لا يوجد ملف.', create: 'فتح ملف', createTitle: 'ملف جديد', chooseClub: 'النادي (اختياري)', personType: 'نوع الشخص (اختياري)', personId: 'معرف الشخص (اختياري)', description: 'الوصف', save: 'إنشاء', cancel: 'إلغاء', startReview: 'بدء المراجعة', scheduleHearing: 'برمجة جلسة استماع', decide: 'إصدار قرار', close: 'إغلاق', evidence: 'الأدلة', hearings: 'الجلسات', decisions: 'القرارات', history: 'السجل', close2: 'إغلاق', summary: 'ملخص', sanctionDescription: 'وصف العقوبة', createClubSanction: 'إنشاء عقوبة نادٍ مرتبطة', sanctionType: 'نوع العقوبة', reason: 'السبب', startsAt: 'البداية' },
} as const

export default function AdminDisciplineManager() {
  const { locale } = useTranslations(); const text = TEXT[locale]
  const [cases, setCases] = useState<Case[]>([]); const [teams, setTeams] = useState<Team[]>([])
  const [selected, setSelected] = useState<Bundle | null>(null); const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false); const [form, setForm] = useState({ clubId: '', personType: '', personId: '', offenseType: '', description: '' })
  const [scheduling, setScheduling] = useState(false); const [hearingForm, setHearingForm] = useState({ scheduledAt: '', location: '' })
  const [deciding, setDeciding] = useState(false); const [decisionForm, setDecisionForm] = useState({ summary: '', sanctionDescription: '' })
  const [withSanction, setWithSanction] = useState(false); const [sanctionForm, setSanctionForm] = useState({ type: 'WARNING', reason: '', startsAt: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try { const query = new URLSearchParams(); if (status) query.set('status', status); const response = await fetch(`/api/admin/discipline?${query}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setCases(data) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setLoading(false) }
  }, [status])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])
  useEffect(() => { void (async () => { try { const response = await fetch('/api/admin/teams?team_type=club', { cache: 'no-store' }); const data = await response.json(); if (response.ok) setTeams((Array.isArray(data) ? data : data.teams ?? []).map((t: { id: string; nom: string }) => ({ id: t.id, nom: t.nom }))) } catch { /* pas bloquant */ } })() }, [])

  async function open(id: string) { const response = await fetch(`/api/admin/discipline/${id}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) return setError(data.error ?? 'Erreur'); setSelected(data) }
  async function action(name: string, payload: Record<string, unknown> = {}) {
    if (!selected) return
    setSaving(true)
    try { const response = await fetch(`/api/admin/discipline/${selected.case.id}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); await Promise.all([load(), open(selected.case.id)]) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }
  async function submitCreate() {
    if (!form.offenseType.trim() || !form.description.trim()) return
    setSaving(true)
    try { const response = await fetch('/api/admin/discipline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clubId: form.clubId || null, personType: form.personType || null, personId: form.personId || null, offenseType: form.offenseType, description: form.description }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setCreating(false); setForm({ clubId: '', personType: '', personId: '', offenseType: '', description: '' }); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }
  async function submitHearing() { if (!hearingForm.scheduledAt) return; await action('hearings', hearingForm); setScheduling(false); setHearingForm({ scheduledAt: '', location: '' }) }
  async function submitDecision() {
    if (!decisionForm.summary.trim()) return
    const payload: Record<string, unknown> = { summary: decisionForm.summary, sanctionDescription: decisionForm.sanctionDescription || null }
    if (withSanction && sanctionForm.reason && sanctionForm.startsAt) payload.clubSanction = { type: sanctionForm.type, reason: sanctionForm.reason, startsAt: sanctionForm.startsAt }
    await action('decision', payload)
    setDeciding(false); setDecisionForm({ summary: '', sanctionDescription: '' }); setWithSanction(false)
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div className="d-flex justify-content-between align-items-start"><div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div><button className="btn btn-primary" onClick={() => setCreating(true)}>{text.create}</button></div>
    {error && <div className="alert alert-danger" onClick={() => setError(null)}>{error}</div>}
    {creating && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{text.createTitle}</strong><button className="btn-close" aria-label={text.close2} onClick={() => setCreating(false)} /></div><div className="card-body row g-2">
      <div className="col-md-4"><label className="form-label">{text.chooseClub}</label><select className="form-select" value={form.clubId} onChange={(e) => setForm({ ...form, clubId: e.target.value })}><option value="">—</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label">{text.personType}</label><select className="form-select" value={form.personType} onChange={(e) => setForm({ ...form, personType: e.target.value })}>{PERSON_TYPES.map((p) => <option key={p} value={p}>{p || '—'}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label">{text.personId}</label><input className="form-control" value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })} /></div>
      <div className="col-md-6"><label className="form-label">{text.offense}</label><input className="form-control" value={form.offenseType} onChange={(e) => setForm({ ...form, offenseType: e.target.value })} /></div>
      <div className="col-12"><label className="form-label">{text.description}</label><textarea className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="col-12 d-flex gap-2"><button disabled={saving} className="btn btn-primary" onClick={() => void submitCreate()}>{text.save}</button><button className="btn btn-outline-secondary" onClick={() => setCreating(false)}>{text.cancel}</button></div>
    </div></div>}
    <div className="card border-0 shadow-sm"><div className="card-body row g-2"><div className="col-md-3"><label className="form-label">{text.status}</label><select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{text.all}</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div></div></div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="p-4">{text.loading}</p> : cases.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.case}</th><th>{text.club}</th><th>{text.offense}</th><th>{text.status}</th><th /></tr></thead><tbody>{cases.map((item) => <tr key={item.id}><td>{item.caseNumber}</td><td>{item.clubName ?? '—'}</td><td>{item.offenseType}</td><td><span className="badge bg-secondary">{item.status}</span></td><td><button className="btn btn-sm btn-outline-primary" onClick={() => void open(item.id)}>{text.open}</button></td></tr>)}</tbody></table></div>}</div></div>
    {selected && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{selected.case.caseNumber}</strong><button className="btn-close" aria-label={text.close2} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      <div>{selected.case.description}</div>
      <div className="d-flex gap-2 flex-wrap">
        {selected.case.status === 'OPEN' && <button disabled={saving} className="btn btn-outline-primary" onClick={() => void action('start-review')}>{text.startReview}</button>}
        {selected.case.status === 'UNDER_REVIEW' && <button disabled={saving} className="btn btn-outline-primary" onClick={() => setScheduling(true)}>{text.scheduleHearing}</button>}
        {(selected.case.status === 'UNDER_REVIEW' || selected.case.status === 'HEARING_SCHEDULED') && <button disabled={saving} className="btn btn-success" onClick={() => setDeciding(true)}>{text.decide}</button>}
        {selected.case.status === 'DECIDED' && <button disabled={saving} className="btn btn-outline-secondary" onClick={() => void action('close')}>{text.close}</button>}
      </div>
      {scheduling && <div className="border rounded p-3 d-flex flex-column gap-2"><input type="datetime-local" className="form-control" value={hearingForm.scheduledAt} onChange={(e) => setHearingForm({ ...hearingForm, scheduledAt: e.target.value })} /><input className="form-control" placeholder="Lieu" value={hearingForm.location} onChange={(e) => setHearingForm({ ...hearingForm, location: e.target.value })} /><div className="d-flex gap-2"><button disabled={saving} className="btn btn-primary btn-sm" onClick={() => void submitHearing()}>{text.save}</button><button className="btn btn-outline-secondary btn-sm" onClick={() => setScheduling(false)}>{text.cancel}</button></div></div>}
      {deciding && <div className="border rounded p-3 d-flex flex-column gap-2">
        <textarea className="form-control" placeholder={text.summary} value={decisionForm.summary} onChange={(e) => setDecisionForm({ ...decisionForm, summary: e.target.value })} />
        <textarea className="form-control" placeholder={text.sanctionDescription} value={decisionForm.sanctionDescription} onChange={(e) => setDecisionForm({ ...decisionForm, sanctionDescription: e.target.value })} />
        {selected.case.clubName && <div className="form-check"><input type="checkbox" className="form-check-input" checked={withSanction} onChange={(e) => setWithSanction(e.target.checked)} id="withSanction" /><label className="form-check-label" htmlFor="withSanction">{text.createClubSanction}</label></div>}
        {withSanction && <div className="row g-2"><div className="col-md-4"><select className="form-select" value={sanctionForm.type} onChange={(e) => setSanctionForm({ ...sanctionForm, type: e.target.value })}>{SANCTION_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div><div className="col-md-4"><input className="form-control" placeholder={text.reason} value={sanctionForm.reason} onChange={(e) => setSanctionForm({ ...sanctionForm, reason: e.target.value })} /></div><div className="col-md-4"><input type="date" className="form-control" value={sanctionForm.startsAt} onChange={(e) => setSanctionForm({ ...sanctionForm, startsAt: e.target.value })} /></div></div>}
        <div className="d-flex gap-2"><button disabled={saving} className="btn btn-primary btn-sm" onClick={() => void submitDecision()}>{text.save}</button><button className="btn btn-outline-secondary btn-sm" onClick={() => setDeciding(false)}>{text.cancel}</button></div>
      </div>}
      <div><h2 className="h6">{text.hearings}</h2>{selected.hearings.map((item) => <div key={item.id} className="border-top py-2">{new Date(item.scheduledAt).toLocaleString()}{item.location ? ` · ${item.location}` : ''}</div>)}</div>
      <div><h2 className="h6">{text.decisions}</h2>{selected.decisions.map((item) => <div key={item.id} className="border-top py-2">{item.summary}{item.sanctionDescription ? ` · ${item.sanctionDescription}` : ''}</div>)}</div>
      <div><h2 className="h6">{text.history}</h2>{selected.events.map((item) => <div key={item.id} className="border-top py-2"><strong>{item.action}</strong> · {item.actorRole}{item.reason ? ` · ${item.reason}` : ''}</div>)}</div>
    </div></div>}
  </div>
}
