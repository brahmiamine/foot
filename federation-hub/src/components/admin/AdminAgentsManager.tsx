'use client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
type Agent = { id: string; fullName: string; status: string; fifaLicenseNumber?: string | null; contactEmail: string; validFrom?: string | null; validUntil?: string | null }
type Agreement = { id: string; playerName?: string | null; clubName?: string | null; startDate: string; endDate: string; status: string }
type HistoryItem = { id: string; action: string; actorRole: string; reason?: string | null; createdAt: string }
type Bundle = { agent: Agent; agreements: Agreement[]; history: HistoryItem[] }
const STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED']
const TEXT = {
  fr: { title: 'Agents et intermédiaires', subtitle: 'Registre fédéral des agents et de leurs mandats de représentation.', all: 'Tous', status: 'Statut', name: 'Nom', email: 'Email', open: 'Détail', loading: 'Chargement…', empty: 'Aucun agent.', create: 'Enregistrer un agent', createTitle: 'Nouvel agent', fifaLicense: 'Numéro FIFA', phone: 'Téléphone', save: 'Créer', cancel: 'Annuler', activate: 'Activer', suspend: 'Suspendre', reactivate: 'Réactiver', revoke: 'Révoquer', reasonRequired: 'Motif obligatoire', agreements: 'Mandats de représentation', addAgreement: 'Nouveau mandat', playerId: 'ID joueur (optionnel)', clubId: 'ID club (optionnel)', startDate: 'Début', endDate: 'Fin', activateAgreement: 'Activer', terminate: 'Résilier', close: 'Fermer', history: 'Historique' },
  en: { title: 'Agents and intermediaries', subtitle: 'Federal registry of agents and their representation agreements.', all: 'All', status: 'Status', name: 'Name', email: 'Email', open: 'Detail', loading: 'Loading…', empty: 'No agent.', create: 'Register an agent', createTitle: 'New agent', fifaLicense: 'FIFA number', phone: 'Phone', save: 'Create', cancel: 'Cancel', activate: 'Activate', suspend: 'Suspend', reactivate: 'Reactivate', revoke: 'Revoke', reasonRequired: 'Reason required', agreements: 'Representation agreements', addAgreement: 'New agreement', playerId: 'Player ID (optional)', clubId: 'Club ID (optional)', startDate: 'Start', endDate: 'End', activateAgreement: 'Activate', terminate: 'Terminate', close: 'Close', history: 'History' },
  ar: { title: 'الوكلاء والوسطاء', subtitle: 'السجل الفدرالي للوكلاء وعقود التمثيل.', all: 'الكل', status: 'الحالة', name: 'الاسم', email: 'البريد الإلكتروني', open: 'التفاصيل', loading: 'جار التحميل…', empty: 'لا يوجد وكيل.', create: 'تسجيل وكيل', createTitle: 'وكيل جديد', fifaLicense: 'رقم الفيفا', phone: 'الهاتف', save: 'إنشاء', cancel: 'إلغاء', activate: 'تفعيل', suspend: 'تعليق', reactivate: 'إعادة تفعيل', revoke: 'سحب', reasonRequired: 'السبب إجباري', agreements: 'عقود التمثيل', addAgreement: 'عقد جديد', playerId: 'معرف اللاعب (اختياري)', clubId: 'معرف النادي (اختياري)', startDate: 'البداية', endDate: 'النهاية', activateAgreement: 'تفعيل', terminate: 'فسخ', close: 'إغلاق', history: 'السجل' },
} as const

export default function AdminAgentsManager() {
  const { locale } = useTranslations(); const text = TEXT[locale]
  const [agents, setAgents] = useState<Agent[]>([]); const [selected, setSelected] = useState<Bundle | null>(null)
  const [status, setStatus] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false); const [form, setForm] = useState({ fullName: '', fifaLicenseNumber: '', contactEmail: '', contactPhone: '' })
  const [addingAgreement, setAddingAgreement] = useState(false); const [agreementForm, setAgreementForm] = useState({ playerId: '', clubId: '', startDate: '', endDate: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try { const query = new URLSearchParams(); if (status) query.set('status', status); const response = await fetch(`/api/admin/agents?${query}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setAgents(data) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setLoading(false) }
  }, [status])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])
  async function open(id: string) { const response = await fetch(`/api/admin/agents/${id}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) return setError(data.error ?? 'Erreur'); setSelected(data) }
  async function submitCreate() {
    if (!form.fullName.trim() || !form.contactEmail.trim()) return
    setSaving(true)
    try { const response = await fetch('/api/admin/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setCreating(false); setForm({ fullName: '', fifaLicenseNumber: '', contactEmail: '', contactPhone: '' }); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }
  async function action(name: string, payload: Record<string, unknown> = {}) {
    if (!selected) return
    setSaving(true)
    try { const response = await fetch(`/api/admin/agents/${selected.agent.id}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); await Promise.all([load(), open(selected.agent.id)]) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }
  async function revoke() { const reason = window.prompt(text.reasonRequired); if (!reason?.trim()) return; await action('revoke', { reason }) }
  async function submitAgreement() {
    if (!selected || !agreementForm.startDate || !agreementForm.endDate || (!agreementForm.playerId && !agreementForm.clubId)) return
    setSaving(true)
    try { const response = await fetch(`/api/admin/agents/${selected.agent.id}/agreements`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: agreementForm.playerId || null, clubId: agreementForm.clubId || null, startDate: agreementForm.startDate, endDate: agreementForm.endDate }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setAddingAgreement(false); setAgreementForm({ playerId: '', clubId: '', startDate: '', endDate: '' }); await open(selected.agent.id) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }
  async function agreementAction(id: string, name: string) {
    setSaving(true)
    try { const response = await fetch(`/api/admin/agreements/${id}/${name}`, { method: 'POST' }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); if (selected) await open(selected.agent.id) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div className="d-flex justify-content-between align-items-start"><div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div><button className="btn btn-primary" onClick={() => setCreating(true)}>{text.create}</button></div>
    {error && <div className="alert alert-danger" onClick={() => setError(null)}>{error}</div>}
    {creating && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{text.createTitle}</strong><button className="btn-close" aria-label={text.close} onClick={() => setCreating(false)} /></div><div className="card-body row g-2">
      <div className="col-md-6"><label className="form-label">{text.name}</label><input className="form-control" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
      <div className="col-md-6"><label className="form-label">{text.fifaLicense}</label><input className="form-control" value={form.fifaLicenseNumber} onChange={(e) => setForm({ ...form, fifaLicenseNumber: e.target.value })} /></div>
      <div className="col-md-6"><label className="form-label">{text.email}</label><input type="email" className="form-control" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
      <div className="col-md-6"><label className="form-label">{text.phone}</label><input className="form-control" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
      <div className="col-12 d-flex gap-2"><button disabled={saving} className="btn btn-primary" onClick={() => void submitCreate()}>{text.save}</button><button className="btn btn-outline-secondary" onClick={() => setCreating(false)}>{text.cancel}</button></div>
    </div></div>}
    <div className="card border-0 shadow-sm"><div className="card-body row g-2"><div className="col-md-3"><label className="form-label">{text.status}</label><select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{text.all}</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div></div></div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="p-4">{text.loading}</p> : agents.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.name}</th><th>{text.email}</th><th>{text.status}</th><th /></tr></thead><tbody>{agents.map((item) => <tr key={item.id}><td>{item.fullName}</td><td>{item.contactEmail}</td><td><span className="badge bg-secondary">{item.status}</span></td><td><button className="btn btn-sm btn-outline-primary" onClick={() => void open(item.id)}>{text.open}</button></td></tr>)}</tbody></table></div>}</div></div>
    {selected && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{selected.agent.fullName}</strong><button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      <div className="d-flex gap-2 flex-wrap">
        {selected.agent.status === 'PENDING' && <button disabled={saving} className="btn btn-success" onClick={() => void action('activate')}>{text.activate}</button>}
        {selected.agent.status === 'ACTIVE' && <button disabled={saving} className="btn btn-outline-warning" onClick={() => void action('suspend')}>{text.suspend}</button>}
        {selected.agent.status === 'SUSPENDED' && <button disabled={saving} className="btn btn-outline-primary" onClick={() => void action('reactivate')}>{text.reactivate}</button>}
        {(selected.agent.status === 'PENDING' || selected.agent.status === 'ACTIVE' || selected.agent.status === 'SUSPENDED') && <button disabled={saving} className="btn btn-outline-danger" onClick={() => void revoke()}>{text.revoke}</button>}
      </div>
      <div><div className="d-flex justify-content-between align-items-center"><h2 className="h6 mb-0">{text.agreements}</h2><button className="btn btn-sm btn-outline-primary" onClick={() => setAddingAgreement(true)}>{text.addAgreement}</button></div>
        {addingAgreement && <div className="border rounded p-3 mt-2 d-flex flex-column gap-2"><input className="form-control" placeholder={text.playerId} value={agreementForm.playerId} onChange={(e) => setAgreementForm({ ...agreementForm, playerId: e.target.value })} /><input className="form-control" placeholder={text.clubId} value={agreementForm.clubId} onChange={(e) => setAgreementForm({ ...agreementForm, clubId: e.target.value })} /><input type="date" className="form-control" value={agreementForm.startDate} onChange={(e) => setAgreementForm({ ...agreementForm, startDate: e.target.value })} /><input type="date" className="form-control" value={agreementForm.endDate} onChange={(e) => setAgreementForm({ ...agreementForm, endDate: e.target.value })} /><div className="d-flex gap-2"><button disabled={saving} className="btn btn-primary btn-sm" onClick={() => void submitAgreement()}>{text.save}</button><button className="btn btn-outline-secondary btn-sm" onClick={() => setAddingAgreement(false)}>{text.cancel}</button></div></div>}
        <div className="table-responsive mt-2"><table className="table table-sm mb-0"><tbody>{selected.agreements.map((item) => <tr key={item.id}><td>{item.playerName ?? item.clubName}</td><td>{new Date(item.startDate).toLocaleDateString()} — {new Date(item.endDate).toLocaleDateString()}</td><td><span className="badge bg-secondary">{item.status}</span></td><td>{item.status === 'DRAFT' && <button disabled={saving} className="btn btn-sm btn-outline-success" onClick={() => void agreementAction(item.id, 'activate')}>{text.activateAgreement}</button>}{item.status === 'ACTIVE' && <button disabled={saving} className="btn btn-sm btn-outline-danger" onClick={() => void agreementAction(item.id, 'terminate')}>{text.terminate}</button>}</td></tr>)}</tbody></table></div>
      </div>
      <div><h2 className="h6">{text.history}</h2>{selected.history.map((item) => <div key={item.id} className="border-top py-2"><strong>{item.action}</strong> · {item.actorRole}{item.reason ? ` · ${item.reason}` : ''}</div>)}</div>
    </div></div>}
  </div>
}
