'use client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
type Inspection = { id: string; clubName: string; stadiumName: string; status: string; inspectionDate: string; expiresAt?: string | null; observations?: string | null; pitchStatus: string; lightingStatus: string; changingRoomsStatus: string; securityStatus: string; capacityStatus: string; medicalStatus: string; mediaStatus: string; varStatus?: string | null }
type Restriction = { id: string; description: string; liftedAt?: string | null }
type HistoryItem = { id: string; action: string; actorRole: string; reason?: string | null; createdAt: string }
type Bundle = { inspection: Inspection; restrictions: Restriction[]; history: HistoryItem[] }
type Team = { id: string; nom: string }
type Stadium = { id: number; nameFr: string }
const ASPECTS = ['pitchStatus', 'lightingStatus', 'changingRoomsStatus', 'securityStatus', 'capacityStatus', 'medicalStatus', 'mediaStatus'] as const
const ASPECT_OPTIONS = ['OK', 'ISSUES', 'CRITICAL', 'NOT_APPLICABLE']
const STATUSES = ['PENDING', 'APPROVED', 'APPROVED_WITH_RESTRICTIONS', 'REJECTED', 'SUSPENDED', 'EXPIRED']
const TEXT = {
  fr: { title: 'Homologation des stades', subtitle: 'Inspections fédérales et décisions d’homologation.', all: 'Tous', status: 'Statut', club: 'Club', stadium: 'Stade', date: 'Date d’inspection', open: 'Détail', loading: 'Chargement…', empty: 'Aucune inspection.', create: 'Nouvelle inspection', createTitle: 'Nouvelle inspection', chooseClub: 'Choisir un club', chooseStadium: 'Choisir un stade', save: 'Créer', cancel: 'Annuler', approve: 'Homologuer', approveRestrictions: 'Homologuer sous réserve', reject: 'Rejeter', suspend: 'Suspendre', reactivate: 'Réactiver', reasonRequired: 'Motif obligatoire', restrictions: 'Réserves (une par ligne)', expiresAt: 'Expire le', observations: 'Observations', close: 'Fermer', history: 'Historique' },
  en: { title: 'Stadium licensing', subtitle: 'Federal inspections and licensing decisions.', all: 'All', status: 'Status', club: 'Club', stadium: 'Stadium', date: 'Inspection date', open: 'Detail', loading: 'Loading…', empty: 'No inspection.', create: 'New inspection', createTitle: 'New inspection', chooseClub: 'Choose a club', chooseStadium: 'Choose a stadium', save: 'Create', cancel: 'Cancel', approve: 'Approve', approveRestrictions: 'Approve with restrictions', reject: 'Reject', suspend: 'Suspend', reactivate: 'Reactivate', reasonRequired: 'Reason required', restrictions: 'Restrictions (one per line)', expiresAt: 'Expires on', observations: 'Observations', close: 'Close', history: 'History' },
  ar: { title: 'ترخيص الملاعب', subtitle: 'المعاينات الفدرالية وقرارات الترخيص.', all: 'الكل', status: 'الحالة', club: 'النادي', stadium: 'الملعب', date: 'تاريخ المعاينة', open: 'التفاصيل', loading: 'جار التحميل…', empty: 'لا توجد معاينة.', create: 'معاينة جديدة', createTitle: 'معاينة جديدة', chooseClub: 'اختر ناديا', chooseStadium: 'اختر ملعبا', save: 'إنشاء', cancel: 'إلغاء', approve: 'ترخيص', approveRestrictions: 'ترخيص مشروط', reject: 'رفض', suspend: 'تعليق', reactivate: 'إعادة تفعيل', reasonRequired: 'السبب إجباري', restrictions: 'التحفظات (واحد في كل سطر)', expiresAt: 'تاريخ الانتهاء', observations: 'ملاحظات', close: 'إغلاق', history: 'السجل' },
} as const

export default function AdminStadiumInspectionsManager() {
  const { locale } = useTranslations(); const text = TEXT[locale]
  const [items, setItems] = useState<Inspection[]>([]); const [teams, setTeams] = useState<Team[]>([]); const [stadiums, setStadiums] = useState<Stadium[]>([])
  const [selected, setSelected] = useState<Bundle | null>(null); const [status, setStatus] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false); const [form, setForm] = useState({ clubId: '', stadiumId: '', seasonId: '', inspectionDate: '', observations: '' })
  const [aspectValues, setAspectValues] = useState<Record<string, string>>(Object.fromEntries(ASPECTS.map((a) => [a, 'OK'])))
  const [decidingRestrictions, setDecidingRestrictions] = useState(''); const [decidingExpiresAt, setDecidingExpiresAt] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const query = new URLSearchParams(); if (status) query.set('status', status); const response = await fetch(`/api/admin/stadium-licensing?${query}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setItems(data) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setLoading(false) }
  }, [status])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])
  useEffect(() => { void (async () => { try { const response = await fetch('/api/admin/teams?team_type=club', { cache: 'no-store' }); const data = await response.json(); if (response.ok) setTeams((Array.isArray(data) ? data : data.teams ?? []).map((t: { id: string; nom: string }) => ({ id: t.id, nom: t.nom }))) } catch { /* pas bloquant */ } })() }, [])
  useEffect(() => { void (async () => { if (!form.clubId) { setStadiums([]); return } try { const response = await fetch(`/api/admin/stadium-licensing/stadiums?clubId=${form.clubId}`, { cache: 'no-store' }); const data = await response.json(); if (response.ok) setStadiums(data) } catch { /* pas bloquant */ } })() }, [form.clubId])

  async function open(id: string) { const response = await fetch(`/api/admin/stadium-licensing/${id}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) return setError(data.error ?? 'Erreur'); setSelected(data) }
  async function action(name: string) {
    if (!selected) return
    const payload: { reason?: string; expiresAt?: string; restrictions?: string[] } = {}
    if (name === 'reject') { const reason = window.prompt(text.reasonRequired); if (!reason?.trim()) return; payload.reason = reason }
    if (name === 'approve-with-restrictions') { payload.restrictions = decidingRestrictions.split('\n').map((s) => s.trim()).filter(Boolean); payload.expiresAt = decidingExpiresAt || undefined }
    if (name === 'approve') payload.expiresAt = decidingExpiresAt || undefined
    setSaving(true)
    try { const response = await fetch(`/api/admin/stadium-licensing/${selected.inspection.id}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); await Promise.all([load(), open(selected.inspection.id)]) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }
  async function submitCreate() {
    if (!form.clubId || !form.stadiumId || !form.seasonId || !form.inspectionDate) { setError(text.reasonRequired); return }
    setSaving(true)
    try { const response = await fetch('/api/admin/stadium-licensing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, ...aspectValues }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setCreating(false); setForm({ clubId: '', stadiumId: '', seasonId: '', inspectionDate: '', observations: '' }); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div className="d-flex justify-content-between align-items-start"><div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div><button className="btn btn-primary" onClick={() => setCreating(true)}>{text.create}</button></div>
    {error && <div className="alert alert-danger" onClick={() => setError(null)}>{error}</div>}
    {creating && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{text.createTitle}</strong><button className="btn-close" aria-label={text.close} onClick={() => setCreating(false)} /></div><div className="card-body row g-2">
      <div className="col-md-4"><label className="form-label">{text.club}</label><select className="form-select" value={form.clubId} onChange={(e) => setForm({ ...form, clubId: e.target.value, stadiumId: '' })}><option value="">{text.chooseClub}</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label">{text.stadium}</label><select className="form-select" value={form.stadiumId} onChange={(e) => setForm({ ...form, stadiumId: e.target.value })}><option value="">{text.chooseStadium}</option>{stadiums.map((s) => <option key={s.id} value={s.id}>{s.nameFr}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label">{text.date}</label><input type="date" className="form-control" value={form.inspectionDate} onChange={(e) => setForm({ ...form, inspectionDate: e.target.value })} /></div>
      <div className="col-md-4"><label className="form-label">Saison</label><input className="form-control" value={form.seasonId} onChange={(e) => setForm({ ...form, seasonId: e.target.value })} placeholder="ID saison" /></div>
      {ASPECTS.map((aspect) => <div className="col-md-4" key={aspect}><label className="form-label">{aspect}</label><select className="form-select" value={aspectValues[aspect]} onChange={(e) => setAspectValues({ ...aspectValues, [aspect]: e.target.value })}>{ASPECT_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select></div>)}
      <div className="col-12"><label className="form-label">{text.observations}</label><textarea className="form-control" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></div>
      <div className="col-12 d-flex gap-2"><button disabled={saving} className="btn btn-primary" onClick={() => void submitCreate()}>{text.save}</button><button className="btn btn-outline-secondary" onClick={() => setCreating(false)}>{text.cancel}</button></div>
    </div></div>}
    <div className="card border-0 shadow-sm"><div className="card-body row g-2"><div className="col-md-3"><label className="form-label">{text.status}</label><select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{text.all}</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div></div></div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="p-4">{text.loading}</p> : items.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.club}</th><th>{text.stadium}</th><th>{text.date}</th><th>{text.status}</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.clubName}</td><td>{item.stadiumName}</td><td>{new Date(item.inspectionDate).toLocaleDateString()}</td><td><span className="badge bg-secondary">{item.status}</span></td><td><button className="btn btn-sm btn-outline-primary" onClick={() => void open(item.id)}>{text.open}</button></td></tr>)}</tbody></table></div>}</div></div>
    {selected && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{selected.inspection.clubName} · {selected.inspection.stadiumName}</strong><button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      {selected.inspection.observations && <div>{selected.inspection.observations}</div>}
      {selected.inspection.status === 'PENDING' && <div className="border rounded p-3 d-flex flex-column gap-2"><label className="form-label">{text.expiresAt}</label><input type="date" className="form-control" value={decidingExpiresAt} onChange={(e) => setDecidingExpiresAt(e.target.value)} /><label className="form-label">{text.restrictions}</label><textarea className="form-control" value={decidingRestrictions} onChange={(e) => setDecidingRestrictions(e.target.value)} /></div>}
      <div className="d-flex gap-2 flex-wrap">
        {selected.inspection.status === 'PENDING' && <><button disabled={saving} className="btn btn-success" onClick={() => void action('approve')}>{text.approve}</button><button disabled={saving} className="btn btn-outline-warning" onClick={() => void action('approve-with-restrictions')}>{text.approveRestrictions}</button><button disabled={saving} className="btn btn-outline-danger" onClick={() => void action('reject')}>{text.reject}</button></>}
        {(selected.inspection.status === 'APPROVED' || selected.inspection.status === 'APPROVED_WITH_RESTRICTIONS') && <button disabled={saving} className="btn btn-outline-danger" onClick={() => void action('suspend')}>{text.suspend}</button>}
        {selected.inspection.status === 'SUSPENDED' && <button disabled={saving} className="btn btn-outline-primary" onClick={() => void action('reactivate')}>{text.reactivate}</button>}
      </div>
      {selected.restrictions.length > 0 && <div><h2 className="h6">{text.restrictions}</h2>{selected.restrictions.map((r) => <div key={r.id} className="border-top py-2">{r.description}</div>)}</div>}
      <div><h2 className="h6">{text.history}</h2>{selected.history.map((item) => <div key={item.id} className="border-top py-2"><strong>{item.action}</strong> · {item.actorRole}{item.reason ? ` · ${item.reason}` : ''}</div>)}</div>
    </div></div>}
  </div>
}
