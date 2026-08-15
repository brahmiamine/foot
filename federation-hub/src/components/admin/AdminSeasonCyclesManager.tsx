'use client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
type Cycle = { id: string; seasonId: string; seasonName: string; status: string; clubLicensingOpenAt?: string | null; clubLicensingCloseAt?: string | null; registrationOpenAt?: string | null; registrationCloseAt?: string | null; previousSeasonId?: string | null; previousSeasonExpiredAt?: string | null }
type HistoryItem = { id: string; action: string; actorRole: string; createdAt: string }
type Bundle = { cycle: Cycle; history: HistoryItem[] }
type Season = { id: string; nom: string }
const TEXT = {
  fr: { title: 'Renouvellement saisonnier', subtitle: 'Assistant fédéral d’ouverture de saison : licences club et inscriptions.', create: 'Créer un cycle', createTitle: 'Nouveau cycle', season: 'Saison', previousSeason: 'Saison précédente (optionnel)', chooseSeason: 'Choisir une saison', save: 'Créer', cancel: 'Annuler', loading: 'Chargement…', empty: 'Aucun cycle réglementaire.', status: 'Statut', open: 'Détail', close2: 'Fermer', activate: 'Activer', clubLicensingWindow: 'Fenêtre licence club', registrationWindow: 'Fenêtre inscriptions', opensAt: 'Ouverture', closesAt: 'Fermeture (optionnel)', setWindow: 'Définir', closeCycle: 'Clôturer le cycle', history: 'Historique', previousExpired: 'Licences saison précédente expirées le' },
  en: { title: 'Season renewal', subtitle: 'Federal season opening assistant: club licensing and registrations.', create: 'Create a cycle', createTitle: 'New cycle', season: 'Season', previousSeason: 'Previous season (optional)', chooseSeason: 'Choose a season', save: 'Create', cancel: 'Cancel', loading: 'Loading…', empty: 'No regulatory cycle.', status: 'Status', open: 'Detail', close2: 'Close', activate: 'Activate', clubLicensingWindow: 'Club licensing window', registrationWindow: 'Registration window', opensAt: 'Opens', closesAt: 'Closes (optional)', setWindow: 'Set', closeCycle: 'Close cycle', history: 'History', previousExpired: 'Previous season licenses expired on' },
  ar: { title: 'تجديد الموسم', subtitle: 'مساعد فدرالي لفتح الموسم: تراخيص الأندية والتسجيلات.', create: 'إنشاء دورة', createTitle: 'دورة جديدة', season: 'الموسم', previousSeason: 'الموسم السابق (اختياري)', chooseSeason: 'اختر موسما', save: 'إنشاء', cancel: 'إلغاء', loading: 'جار التحميل…', empty: 'لا توجد دورة تنظيمية.', status: 'الحالة', open: 'التفاصيل', close2: 'إغلاق', activate: 'تفعيل', clubLicensingWindow: 'نافذة ترخيص النادي', registrationWindow: 'نافذة التسجيل', opensAt: 'الفتح', closesAt: 'الإغلاق (اختياري)', setWindow: 'تحديد', closeCycle: 'إغلاق الدورة', history: 'السجل', previousExpired: 'انتهت تراخيص الموسم السابق في' },
} as const

export default function AdminSeasonCyclesManager() {
  const { locale } = useTranslations(); const text = TEXT[locale]
  const [cycles, setCycles] = useState<Cycle[]>([]); const [seasons, setSeasons] = useState<Season[]>([])
  const [selected, setSelected] = useState<Bundle | null>(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false); const [form, setForm] = useState({ seasonId: '', previousSeasonId: '' })
  const [clubWindow, setClubWindow] = useState({ opensAt: '', closesAt: '' }); const [regWindow, setRegWindow] = useState({ opensAt: '', closesAt: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try { const response = await fetch('/api/admin/season-cycles', { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setCycles(data) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setLoading(false) }
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])
  useEffect(() => { void (async () => { try { const response = await fetch('/api/admin/saisons', { cache: 'no-store' }); const data = await response.json(); if (response.ok) setSeasons((Array.isArray(data) ? data : []).map((s: { id: string; nom: string }) => ({ id: s.id, nom: s.nom }))) } catch { /* pas bloquant */ } })() }, [])

  async function open(id: string) { const response = await fetch(`/api/admin/season-cycles/${id}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) return setError(data.error ?? 'Erreur'); setSelected(data) }
  async function submitCreate() {
    if (!form.seasonId) return
    setSaving(true)
    try { const response = await fetch('/api/admin/season-cycles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seasonId: form.seasonId, previousSeasonId: form.previousSeasonId || null }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); setCreating(false); setForm({ seasonId: '', previousSeasonId: '' }); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }
  async function callAction(path: string, body?: unknown) {
    if (!selected) return
    setSaving(true)
    try { const response = await fetch(`/api/admin/season-cycles/${selected.cycle.id}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Erreur'); await Promise.all([load(), open(selected.cycle.id)]) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div className="d-flex justify-content-between align-items-start"><div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div><button className="btn btn-primary" onClick={() => setCreating(true)}>{text.create}</button></div>
    {error && <div className="alert alert-danger" onClick={() => setError(null)}>{error}</div>}
    {creating && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{text.createTitle}</strong><button className="btn-close" aria-label={text.close2} onClick={() => setCreating(false)} /></div><div className="card-body row g-2">
      <div className="col-md-6"><label className="form-label">{text.season}</label><select className="form-select" value={form.seasonId} onChange={(e) => setForm({ ...form, seasonId: e.target.value })}><option value="">{text.chooseSeason}</option>{seasons.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</select></div>
      <div className="col-md-6"><label className="form-label">{text.previousSeason}</label><select className="form-select" value={form.previousSeasonId} onChange={(e) => setForm({ ...form, previousSeasonId: e.target.value })}><option value="">—</option>{seasons.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</select></div>
      <div className="col-12 d-flex gap-2"><button disabled={saving} className="btn btn-primary" onClick={() => void submitCreate()}>{text.save}</button><button className="btn btn-outline-secondary" onClick={() => setCreating(false)}>{text.cancel}</button></div>
    </div></div>}
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="p-4">{text.loading}</p> : cycles.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.season}</th><th>{text.status}</th><th /></tr></thead><tbody>{cycles.map((item) => <tr key={item.id}><td>{item.seasonName}</td><td><span className="badge bg-secondary">{item.status}</span></td><td><button className="btn btn-sm btn-outline-primary" onClick={() => void open(item.id)}>{text.open}</button></td></tr>)}</tbody></table></div>}</div></div>
    {selected && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{selected.cycle.seasonName}</strong><button className="btn-close" aria-label={text.close2} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      {selected.cycle.status === 'DRAFT' && <button disabled={saving} className="btn btn-primary align-self-start" onClick={() => void callAction('/activate')}>{text.activate}</button>}
      {selected.cycle.status !== 'CLOSED' && <>
        <div className="border rounded p-3"><h2 className="h6">{text.clubLicensingWindow}</h2>{selected.cycle.clubLicensingOpenAt && <p className="text-muted small mb-2">{new Date(selected.cycle.clubLicensingOpenAt).toLocaleString()}{selected.cycle.clubLicensingCloseAt ? ` — ${new Date(selected.cycle.clubLicensingCloseAt).toLocaleString()}` : ''}</p>}<div className="row g-2"><div className="col-md-5"><input type="datetime-local" className="form-control" value={clubWindow.opensAt} onChange={(e) => setClubWindow({ ...clubWindow, opensAt: e.target.value })} placeholder={text.opensAt} /></div><div className="col-md-5"><input type="datetime-local" className="form-control" value={clubWindow.closesAt} onChange={(e) => setClubWindow({ ...clubWindow, closesAt: e.target.value })} placeholder={text.closesAt} /></div><div className="col-md-2"><button disabled={saving || !clubWindow.opensAt} className="btn btn-outline-primary w-100" onClick={() => void callAction('/club-licensing-window', { opensAt: clubWindow.opensAt, closesAt: clubWindow.closesAt || null })}>{text.setWindow}</button></div></div></div>
        <div className="border rounded p-3"><h2 className="h6">{text.registrationWindow}</h2>{selected.cycle.registrationOpenAt && <p className="text-muted small mb-2">{new Date(selected.cycle.registrationOpenAt).toLocaleString()}{selected.cycle.registrationCloseAt ? ` — ${new Date(selected.cycle.registrationCloseAt).toLocaleString()}` : ''}</p>}<div className="row g-2"><div className="col-md-5"><input type="datetime-local" className="form-control" value={regWindow.opensAt} onChange={(e) => setRegWindow({ ...regWindow, opensAt: e.target.value })} placeholder={text.opensAt} /></div><div className="col-md-5"><input type="datetime-local" className="form-control" value={regWindow.closesAt} onChange={(e) => setRegWindow({ ...regWindow, closesAt: e.target.value })} placeholder={text.closesAt} /></div><div className="col-md-2"><button disabled={saving || !regWindow.opensAt} className="btn btn-outline-primary w-100" onClick={() => void callAction('/registration-window', { opensAt: regWindow.opensAt, closesAt: regWindow.closesAt || null })}>{text.setWindow}</button></div></div></div>
        <button disabled={saving} className="btn btn-outline-danger align-self-start" onClick={() => void callAction('/close')}>{text.closeCycle}</button>
      </>}
      {selected.cycle.previousSeasonExpiredAt && <div className="alert alert-info">{text.previousExpired} {new Date(selected.cycle.previousSeasonExpiredAt).toLocaleString()}</div>}
      <div><h2 className="h6">{text.history}</h2>{selected.history.map((item) => <div key={item.id} className="border-top py-2"><strong>{item.action}</strong> · {item.actorRole}</div>)}</div>
    </div></div>}
  </div>
}
