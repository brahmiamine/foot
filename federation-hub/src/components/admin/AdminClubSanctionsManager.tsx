'use client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
type Sanction = { id: string; clubId: string; clubName: string; seasonId?: string | null; type: string; reason: string; startsAt: string; endsAt?: string | null; amountDue?: string | null; currency?: string | null; status: string; enforceable: boolean; liftReason?: string | null; createdAt: string }
type HistoryItem = { id: string; action: string; actorRole: string; reason?: string | null; createdAt: string }
type Bundle = { sanction: Sanction; history: HistoryItem[] }
type Team = { id: string; nom: string }
const TYPES = ['TRANSFER_BAN', 'REGISTRATION_BAN', 'COMPETITION_BAN', 'FINE', 'POINT_DEDUCTION', 'MATCH_BEHIND_CLOSED_DOORS', 'STADIUM_SUSPENSION', 'COMPETITION_EXCLUSION', 'WARNING']
const STATUSES = ['ACTIVE', 'SUSPENDED', 'LIFTED', 'EXPIRED', 'CANCELLED']
const TEXT = {
  fr: { title: 'Sanctions clubs', subtitle: 'Interdictions de recrutement, engagement et autres sanctions fédérales.', all: 'Tous', club: 'Club', type: 'Type', status: 'Statut', reason: 'Motif', period: 'Période', open: 'Détail', loading: 'Chargement…', empty: 'Aucune sanction.', create: 'Créer une sanction', createTitle: 'Nouvelle sanction', chooseClub: 'Choisir un club', startsAt: 'Début', endsAt: 'Fin (optionnel)', amountDue: 'Montant (optionnel)', currency: 'Devise', save: 'Créer', cancel: 'Annuler', reasonRequired: 'Motif obligatoire', suspend: 'Suspendre', reactivate: 'Réactiver', lift: 'Lever', cancelSanction: 'Annuler', history: 'Historique', close: 'Fermer', enforceable: 'Opposable', notEnforceable: 'Non opposable', liftReason: 'Motif de la levée' },
  en: { title: 'Club sanctions', subtitle: 'Recruitment and entry bans and other federal sanctions.', all: 'All', club: 'Club', type: 'Type', status: 'Status', reason: 'Reason', period: 'Period', open: 'Detail', loading: 'Loading…', empty: 'No sanction.', create: 'Create a sanction', createTitle: 'New sanction', chooseClub: 'Choose a club', startsAt: 'Start', endsAt: 'End (optional)', amountDue: 'Amount (optional)', currency: 'Currency', save: 'Create', cancel: 'Cancel', reasonRequired: 'Reason required', suspend: 'Suspend', reactivate: 'Reactivate', lift: 'Lift', cancelSanction: 'Cancel', history: 'History', close: 'Close', enforceable: 'Enforceable', notEnforceable: 'Not enforceable', liftReason: 'Lift reason' },
  ar: { title: 'عقوبات الأندية', subtitle: 'منع الانتقالات والمشاركة وباقي العقوبات الفدرالية.', all: 'الكل', club: 'النادي', type: 'النوع', status: 'الحالة', reason: 'السبب', period: 'الفترة', open: 'التفاصيل', loading: 'جار التحميل…', empty: 'لا توجد عقوبات.', create: 'إنشاء عقوبة', createTitle: 'عقوبة جديدة', chooseClub: 'اختر ناديا', startsAt: 'البداية', endsAt: 'النهاية (اختياري)', amountDue: 'المبلغ (اختياري)', currency: 'العملة', save: 'إنشاء', cancel: 'إلغاء', reasonRequired: 'السبب إجباري', suspend: 'تعليق', reactivate: 'إعادة تفعيل', lift: 'رفع', cancelSanction: 'إلغاء', history: 'السجل', close: 'إغلاق', enforceable: 'سارية', notEnforceable: 'غير سارية', liftReason: 'سبب الرفع' },
} as const

export default function AdminClubSanctionsManager() {
  const { locale } = useTranslations(); const text = TEXT[locale]
  const [sanctions, setSanctions] = useState<Sanction[]>([]); const [teams, setTeams] = useState<Team[]>([])
  const [selected, setSelected] = useState<Bundle | null>(null); const [status, setStatus] = useState(''); const [type, setType] = useState('')
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ clubId: '', type: 'TRANSFER_BAN', reason: '', startsAt: '', endsAt: '', amountDue: '', currency: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams(); if (status) query.set('status', status); if (type) query.set('type', type)
      const response = await fetch(`/api/admin/sanctions?${query}`, { cache: 'no-store' })
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setSanctions(data)
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setLoading(false) }
  }, [status, type])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])
  useEffect(() => { void (async () => { try { const response = await fetch('/api/admin/teams?team_type=club', { cache: 'no-store' }); const data = await response.json(); if (response.ok) setTeams((Array.isArray(data) ? data : data.teams ?? []).map((t: { id: string; nom: string }) => ({ id: t.id, nom: t.nom }))) } catch { /* pas bloquant */ } })() }, [])

  async function open(id: string) { const response = await fetch(`/api/admin/sanctions/${id}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) return setError(data.error ?? 'Erreur'); setSelected(data) }
  async function action(name: string) {
    if (!selected) return
    const payload: { reason?: string } = {}
    if (name === 'lift' || name === 'cancel') { const reason = window.prompt(text.reasonRequired); if (!reason?.trim()) return; payload.reason = reason }
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/sanctions/${selected.sanction.id}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur')
      await Promise.all([load(), open(selected.sanction.id)])
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }
  async function submitCreate() {
    if (!form.clubId || !form.reason.trim() || !form.startsAt) { setError(text.reasonRequired); return }
    setSaving(true)
    try {
      const response = await fetch('/api/admin/sanctions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clubId: form.clubId, type: form.type, reason: form.reason, startsAt: form.startsAt, endsAt: form.endsAt || null, amountDue: form.amountDue || null, currency: form.currency || null }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setCreating(false); setForm({ clubId: '', type: 'TRANSFER_BAN', reason: '', startsAt: '', endsAt: '', amountDue: '', currency: '' }); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div className="d-flex justify-content-between align-items-start"><div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div><button className="btn btn-primary" onClick={() => setCreating(true)}>{text.create}</button></div>
    {error && <div className="alert alert-danger" onClick={() => setError(null)}>{error}</div>}
    {creating && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{text.createTitle}</strong><button className="btn-close" aria-label={text.close} onClick={() => setCreating(false)} /></div><div className="card-body row g-2">
      <div className="col-md-4"><label className="form-label">{text.club}</label><select className="form-select" value={form.clubId} onChange={(e) => setForm({ ...form, clubId: e.target.value })}><option value="">{text.chooseClub}</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label">{text.type}</label><select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{TYPES.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label">{text.startsAt}</label><input type="date" className="form-control" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
      <div className="col-md-4"><label className="form-label">{text.endsAt}</label><input type="date" className="form-control" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></div>
      <div className="col-md-4"><label className="form-label">{text.amountDue}</label><input type="number" className="form-control" value={form.amountDue} onChange={(e) => setForm({ ...form, amountDue: e.target.value })} /></div>
      <div className="col-md-4"><label className="form-label">{text.currency}</label><input className="form-control" maxLength={3} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
      <div className="col-12"><label className="form-label">{text.reason}</label><textarea className="form-control" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
      <div className="col-12 d-flex gap-2"><button disabled={saving} className="btn btn-primary" onClick={() => void submitCreate()}>{text.save}</button><button className="btn btn-outline-secondary" onClick={() => setCreating(false)}>{text.cancel}</button></div>
    </div></div>}
    <div className="card border-0 shadow-sm"><div className="card-body row g-2">
      <div className="col-md-3"><label className="form-label">{text.status}</label><select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{text.all}</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="col-md-3"><label className="form-label">{text.type}</label><select className="form-select" value={type} onChange={(e) => setType(e.target.value)}><option value="">{text.all}</option>{TYPES.map((item) => <option key={item}>{item}</option>)}</select></div>
    </div></div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="p-4">{text.loading}</p> : sanctions.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.club}</th><th>{text.type}</th><th>{text.status}</th><th>{text.period}</th><th /></tr></thead><tbody>{sanctions.map((item) => <tr key={item.id}><td>{item.clubName}</td><td>{item.type}</td><td><span className={`badge ${item.enforceable ? 'bg-danger' : 'bg-secondary'}`}>{item.status}</span></td><td>{new Date(item.startsAt).toLocaleDateString()}{item.endsAt ? ` — ${new Date(item.endsAt).toLocaleDateString()}` : ''}</td><td><button className="btn btn-sm btn-outline-primary" onClick={() => void open(item.id)}>{text.open}</button></td></tr>)}</tbody></table></div>}</div></div>
    {selected && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{selected.sanction.clubName} · {selected.sanction.type}</strong><button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      <div className={`alert ${selected.sanction.enforceable ? 'alert-danger' : 'alert-secondary'}`}>{selected.sanction.enforceable ? text.enforceable : text.notEnforceable}</div>
      <div><strong>{text.reason}:</strong> {selected.sanction.reason}</div>
      {selected.sanction.liftReason && <div><strong>{text.liftReason}:</strong> {selected.sanction.liftReason}</div>}
      <div className="d-flex gap-2">
        {selected.sanction.status === 'ACTIVE' && <button disabled={saving} className="btn btn-outline-warning" onClick={() => void action('suspend')}>{text.suspend}</button>}
        {selected.sanction.status === 'SUSPENDED' && <button disabled={saving} className="btn btn-outline-primary" onClick={() => void action('reactivate')}>{text.reactivate}</button>}
        {(selected.sanction.status === 'ACTIVE' || selected.sanction.status === 'SUSPENDED') && <><button disabled={saving} className="btn btn-success" onClick={() => void action('lift')}>{text.lift}</button><button disabled={saving} className="btn btn-outline-danger" onClick={() => void action('cancel')}>{text.cancelSanction}</button></>}
      </div>
      <div><h2 className="h6">{text.history}</h2>{selected.history.map((item) => <div key={item.id} className="border-top py-2"><strong>{item.action}</strong> · {item.actorRole}{item.reason ? ` · ${item.reason}` : ''}</div>)}</div>
    </div></div>}
  </div>
}
