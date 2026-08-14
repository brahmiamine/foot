'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'

type RegistrationStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'CANCELLED'
type EligibilityStatus = 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING'
interface Registration { id: string; playerId: string; playerName: string; clubName: string; seasonName: string; licenseId: string; status: RegistrationStatus; eligibilityStatus: EligibilityStatus; registeredAt: string | null; rejectionReason: string | null; }
interface HistoryRecord { id: string; action: string; actorRole: string; reason: string | null; createdAt: string; }
interface Bundle { registration: Registration; history: HistoryRecord[]; }

const STATUSES: RegistrationStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'CANCELLED']
const ELIGIBILITIES: EligibilityStatus[] = ['PENDING', 'ELIGIBLE', 'INELIGIBLE']
const BADGES: Record<RegistrationStatus, string> = { DRAFT: 'bg-secondary-subtle text-secondary', SUBMITTED: 'bg-info-subtle text-info', APPROVED: 'bg-success-subtle text-success', REJECTED: 'bg-danger-subtle text-danger', SUSPENDED: 'bg-warning-subtle text-warning', CANCELLED: 'bg-dark-subtle text-dark' }
const ELIGIBILITY_BADGES: Record<EligibilityStatus, string> = { ELIGIBLE: 'bg-success-subtle text-success', INELIGIBLE: 'bg-danger-subtle text-danger', PENDING: 'bg-warning-subtle text-warning' }
const TEXT = {
  fr: { title: 'Inscriptions joueurs', subtitle: 'Valider les inscriptions réglementaires par compétition-saison et contrôler l’éligibilité.', all: 'Tous', player: 'Joueur', club: 'Club', season: 'Compétition · saison', status: 'Statut', eligibility: 'Éligibilité', open: 'Examiner', loading: 'Chargement…', empty: 'Aucune inscription dans votre périmètre.', history: 'Historique', noHistory: 'Aucun événement.', approve: 'Approuver', reject: 'Rejeter', suspend: 'Suspendre', reactivate: 'Réactiver', cancel: 'Annuler', reason: 'Motif obligatoire', decision: 'Décision', license: 'Licence liée', close: 'Fermer' },
  ar: { title: 'تسجيلات اللاعبين', subtitle: 'المصادقة على التسجيلات التنظيمية حسب المسابقة والموسم ومراقبة الأهلية.', all: 'الكل', player: 'اللاعب', club: 'النادي', season: 'المسابقة · الموسم', status: 'الحالة', eligibility: 'الأهلية', open: 'دراسة', loading: 'جار التحميل…', empty: 'لا يوجد تسجيل ضمن نطاقك.', history: 'السجل', noHistory: 'لا يوجد حدث.', approve: 'موافقة', reject: 'رفض', suspend: 'تعليق', reactivate: 'إعادة التفعيل', cancel: 'إلغاء', reason: 'السبب إجباري', decision: 'القرار', license: 'الترخيص المرتبط', close: 'إغلاق' },
  en: { title: 'Player registrations', subtitle: 'Approve regulatory registrations by competition season and control eligibility.', all: 'All', player: 'Player', club: 'Club', season: 'Competition · season', status: 'Status', eligibility: 'Eligibility', open: 'Review', loading: 'Loading…', empty: 'No registration in your scope.', history: 'History', noHistory: 'No event.', approve: 'Approve', reject: 'Reject', suspend: 'Suspend', reactivate: 'Reactivate', cancel: 'Cancel', reason: 'Reason is required', decision: 'Decision', license: 'Linked license', close: 'Close' },
}

export default function AdminPlayerRegistrationsManager() {
  const { locale } = useTranslations()
  const text = TEXT[locale]
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [selected, setSelected] = useState<Bundle | null>(null)
  const [status, setStatus] = useState('')
  const [eligibility, setEligibility] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const query = new URLSearchParams()
      if (status) query.set('status', status)
      if (eligibility) query.set('eligibilityStatus', eligibility)
      const response = await fetch(`/api/admin/registrations?${query}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setRegistrations(data)
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') }
    finally { setLoading(false) }
  }, [status, eligibility])
  useEffect(() => { void load() }, [load])

  async function open(id: string) {
    const response = await fetch(`/api/admin/registrations/${id}`, { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) { setError(data.error ?? 'Erreur'); return }
    setSelected(data)
  }
  async function action(name: 'approve' | 'reject' | 'suspend' | 'reactivate' | 'cancel') {
    if (!selected) return
    const payload: { reason?: string } = {}
    if (['reject', 'suspend', 'cancel'].includes(name)) {
      const reason = window.prompt(text.reason)
      if (!reason?.trim()) return
      payload.reason = reason
    }
    setSaving(true); setError(null)
    try {
      const response = await fetch(`/api/admin/registrations/${selected.registration.id}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      await Promise.all([load(), open(selected.registration.id)])
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') }
    finally { setSaving(false) }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div>
    {error && <div className="alert alert-danger mb-0">{error}</div>}
    <div className="card border-0 shadow-sm"><div className="card-body"><div className="row g-2"><div className="col-md-3"><label className="form-label">{text.status}</label><select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{text.all}</option>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select></div><div className="col-md-3"><label className="form-label">{text.eligibility}</label><select className="form-select" value={eligibility} onChange={(event) => setEligibility(event.target.value)}><option value="">{text.all}</option>{ELIGIBILITIES.map((value) => <option key={value}>{value}</option>)}</select></div></div></div></div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="p-4 mb-0">{text.loading}</p> : registrations.length === 0 ? <p className="p-4 mb-0 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.player}</th><th>{text.club}</th><th>{text.season}</th><th>{text.status}</th><th>{text.eligibility}</th><th /></tr></thead><tbody>{registrations.map((registration) => <tr key={registration.id}><td>{registration.playerName}</td><td>{registration.clubName}</td><td>{registration.seasonName}</td><td><span className={`badge ${BADGES[registration.status]}`}>{registration.status}</span></td><td><span className={`badge ${ELIGIBILITY_BADGES[registration.eligibilityStatus]}`}>{registration.eligibilityStatus}</span></td><td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={() => void open(registration.id)}>{text.open}</button></td></tr>)}</tbody></table></div>}</div></div>
    {selected && <div className="card border-primary shadow-sm"><div className="card-header bg-transparent d-flex justify-content-between"><div><strong>{selected.registration.playerName}</strong> · {selected.registration.clubName} <span className={`badge ms-2 ${BADGES[selected.registration.status]}`}>{selected.registration.status}</span> <span className={`badge ms-1 ${ELIGIBILITY_BADGES[selected.registration.eligibilityStatus]}`}>{selected.registration.eligibilityStatus}</span></div><button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      <div><strong>{text.season}:</strong> {selected.registration.seasonName}<br /><strong>{text.license}:</strong> {selected.registration.licenseId}</div>
      {selected.registration.rejectionReason && <div className="alert alert-warning mb-0"><strong>{text.decision}:</strong> {selected.registration.rejectionReason}</div>}
      <div className="d-flex gap-2 flex-wrap">{selected.registration.status === 'SUBMITTED' && <><button disabled={saving} className="btn btn-success" onClick={() => void action('approve')}>{text.approve}</button><button disabled={saving} className="btn btn-outline-danger" onClick={() => void action('reject')}>{text.reject}</button><button disabled={saving} className="btn btn-danger" onClick={() => void action('cancel')}>{text.cancel}</button></>}{selected.registration.status === 'APPROVED' && <><button disabled={saving} className="btn btn-warning" onClick={() => void action('suspend')}>{text.suspend}</button><button disabled={saving} className="btn btn-danger" onClick={() => void action('cancel')}>{text.cancel}</button></>}{selected.registration.status === 'SUSPENDED' && <><button disabled={saving} className="btn btn-success" onClick={() => void action('reactivate')}>{text.reactivate}</button><button disabled={saving} className="btn btn-danger" onClick={() => void action('cancel')}>{text.cancel}</button></>}</div>
      <div><h2 className="h6">{text.history}</h2>{selected.history.length === 0 ? <p className="text-muted">{text.noHistory}</p> : <ul className="list-group list-group-flush">{selected.history.map((event) => <li key={event.id} className="list-group-item px-0"><strong>{event.action}</strong> · {event.actorRole}<div className="small text-muted">{new Date(event.createdAt).toLocaleString(locale === 'ar' ? 'ar-TN' : locale === 'fr' ? 'fr-FR' : 'en-GB')}{event.reason ? ` · ${event.reason}` : ''}</div></li>)}</ul>}</div>
    </div></div>}
  </div>
}
