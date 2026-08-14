'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from '@/lib/i18n'

type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED'
type RequirementStatus = 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT' | 'WAIVED'

interface ApplicationSummary {
  id: string
  clubId: string
  clubName: string
  seasonId: string
  seasonName: string
  federationId: string
  leagueId: string | null
  status: ApplicationStatus
  updatedAt: string
}

interface Requirement {
  id: string
  category: string
  code: string
  label: string
  description: string | null
  mandatory: boolean
  status: RequirementStatus
  reviewComment: string | null
  waiverReason: string | null
}

interface DocumentRecord {
  id: string
  requirementId: string | null
  fileUrl: string
  fileName: string
  version: number
  status: string
  checksum: string
}

interface HistoryRecord {
  id: string
  action: string
  fromStatus: string | null
  toStatus: string | null
  actorRole: string
  reason: string | null
  createdAt: string
}

interface Bundle {
  application: ApplicationSummary
  requirements: Requirement[]
  documents: DocumentRecord[]
  history: HistoryRecord[]
}

const STATUS_BADGES: Record<ApplicationStatus, string> = {
  DRAFT: 'bg-secondary-subtle text-secondary',
  SUBMITTED: 'bg-info-subtle text-info',
  UNDER_REVIEW: 'bg-primary-subtle text-primary',
  CHANGES_REQUESTED: 'bg-warning-subtle text-warning',
  APPROVED: 'bg-success-subtle text-success',
  REJECTED: 'bg-danger-subtle text-danger',
  SUSPENDED: 'bg-danger-subtle text-danger',
  EXPIRED: 'bg-dark-subtle text-dark',
}

const TEXT = {
  fr: {
    title: 'Licences et conformité des clubs', subtitle: 'Examiner les dossiers réglementaires par saison, ligue et club.',
    all: 'Tous', loading: 'Chargement…', empty: 'Aucun dossier dans votre périmètre.', open: 'Examiner',
    club: 'Club', season: 'Saison', status: 'Statut', requirements: 'Exigences', documents: 'Documents', history: 'Historique',
    mandatory: 'obligatoire', comment: 'Observation fédérale', waiver: 'Motif de dérogation', save: 'Enregistrer',
    start: 'Commencer l’examen', changes: 'Demander des corrections', approve: 'Approuver', reject: 'Rejeter', suspend: 'Suspendre', reactivate: 'Réactiver',
    reason: 'Motif de la décision', noDocuments: 'Aucun document.', noHistory: 'Aucun historique.', close: 'Fermer',
  },
  ar: {
    title: 'تراخيص الأندية والامتثال', subtitle: 'دراسة الملفات التنظيمية حسب الموسم والرابطة والنادي.',
    all: 'الكل', loading: 'جار التحميل…', empty: 'لا يوجد ملف ضمن نطاق صلاحياتك.', open: 'دراسة الملف',
    club: 'النادي', season: 'الموسم', status: 'الحالة', requirements: 'المتطلبات', documents: 'الوثائق', history: 'السجل',
    mandatory: 'إجباري', comment: 'ملاحظة الجامعة', waiver: 'سبب الاستثناء', save: 'حفظ',
    start: 'بدء الدراسة', changes: 'طلب تعديلات', approve: 'موافقة', reject: 'رفض', suspend: 'تعليق', reactivate: 'إعادة التفعيل',
    reason: 'سبب القرار', noDocuments: 'لا توجد وثائق.', noHistory: 'لا يوجد سجل.', close: 'إغلاق',
  },
  en: {
    title: 'Club licensing and compliance', subtitle: 'Review regulatory dossiers by season, league and club.',
    all: 'All', loading: 'Loading…', empty: 'No dossier in your scope.', open: 'Review',
    club: 'Club', season: 'Season', status: 'Status', requirements: 'Requirements', documents: 'Documents', history: 'History',
    mandatory: 'mandatory', comment: 'Federation comment', waiver: 'Waiver reason', save: 'Save',
    start: 'Start review', changes: 'Request changes', approve: 'Approve', reject: 'Reject', suspend: 'Suspend', reactivate: 'Reactivate',
    reason: 'Decision reason', noDocuments: 'No documents.', noHistory: 'No history.', close: 'Close',
  },
}

export default function AdminClubLicensingManager() {
  const { locale } = useTranslations()
  const text = TEXT[locale]
  const [applications, setApplications] = useState<ApplicationSummary[]>([])
  const [selected, setSelected] = useState<Bundle | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requirementDrafts, setRequirementDrafts] = useState<Record<string, { status: RequirementStatus; reviewComment: string; waiverReason: string }>>({})

  const loadApplications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''
      const response = await fetch(`/api/admin/club-licensing${query}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setApplications(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  async function openApplication(id: string) {
    setError(null)
    const response = await fetch(`/api/admin/club-licensing/${id}`, { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error ?? 'Erreur')
      return
    }
    setSelected(data)
    setRequirementDrafts(Object.fromEntries(data.requirements.map((requirement: Requirement) => [
      requirement.id,
      { status: requirement.status, reviewComment: requirement.reviewComment ?? '', waiverReason: requirement.waiverReason ?? '' },
    ])))
  }

  useEffect(() => { void loadApplications() }, [loadApplications])

  const progress = useMemo(() => {
    if (!selected) return 0
    const mandatory = selected.requirements.filter((item) => item.mandatory)
    if (!mandatory.length) return 100
    return Math.round((mandatory.filter((item) => item.status === 'COMPLIANT' || item.status === 'WAIVED').length / mandatory.length) * 100)
  }, [selected])

  async function applyAction(action: string, needsReason = false) {
    if (!selected) return
    const reason = needsReason ? window.prompt(text.reason) : null
    if (needsReason && !reason?.trim()) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/club-licensing/${selected.application.id}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      await Promise.all([openApplication(selected.application.id), loadApplications()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function saveRequirement(requirementId: string) {
    if (!selected) return
    const draft = requirementDrafts[requirementId]
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/club-licensing/${selected.application.id}/requirements/${requirementId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      await openApplication(selected.application.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const statusLabels: Record<ApplicationStatus, string> = locale === 'ar'
    ? { DRAFT: 'مسودة', SUBMITTED: 'مودع', UNDER_REVIEW: 'قيد الدراسة', CHANGES_REQUESTED: 'تعديلات مطلوبة', APPROVED: 'مقبول', REJECTED: 'مرفوض', SUSPENDED: 'معلق', EXPIRED: 'منتهي' }
    : { DRAFT: 'Brouillon', SUBMITTED: 'Soumis', UNDER_REVIEW: 'En examen', CHANGES_REQUESTED: 'Corrections demandées', APPROVED: 'Approuvé', REJECTED: 'Rejeté', SUSPENDED: 'Suspendu', EXPIRED: 'Expiré' }

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div><h2 className="mb-1">{text.title}</h2><p className="text-muted mb-0">{text.subtitle}</p></div>
        <select className="form-select w-auto" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">{text.all}</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {error && <div className="alert alert-danger mb-0">{error}</div>}
      <div className="card border-0 shadow-sm"><div className="card-body p-0">
        {loading ? <p className="p-4 mb-0 text-muted">{text.loading}</p> : applications.length === 0 ? <p className="p-4 mb-0 text-muted">{text.empty}</p> : (
          <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.club}</th><th>{text.season}</th><th>{text.status}</th><th /></tr></thead><tbody>
            {applications.map((application) => <tr key={application.id}><td className="fw-semibold">{application.clubName}</td><td>{application.seasonName}</td><td><span className={`badge ${STATUS_BADGES[application.status]}`}>{statusLabels[application.status]}</span></td><td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={() => void openApplication(application.id)}>{text.open}</button></td></tr>)}
          </tbody></table></div>
        )}
      </div></div>

      {selected && <div className="card border-primary shadow-sm"><div className="card-header bg-transparent d-flex justify-content-between align-items-center">
        <div><strong>{selected.application.clubName ?? selected.application.clubId}</strong><span className={`badge ms-2 ${STATUS_BADGES[selected.application.status]}`}>{statusLabels[selected.application.status]}</span></div>
        <button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} />
      </div><div className="card-body d-flex flex-column gap-4">
        <div><div className="d-flex justify-content-between small mb-1"><span>{text.requirements}</span><span>{progress}%</span></div><div className="progress"><div className="progress-bar" style={{ width: `${progress}%` }} /></div></div>
        <div className="d-flex gap-2 flex-wrap">
          {selected.application.status === 'SUBMITTED' && <button disabled={saving} className="btn btn-primary" onClick={() => void applyAction('start-review')}>{text.start}</button>}
          {selected.application.status === 'UNDER_REVIEW' && <><button disabled={saving} className="btn btn-warning" onClick={() => void applyAction('request-changes', true)}>{text.changes}</button><button disabled={saving} className="btn btn-success" onClick={() => void applyAction('approve')}>{text.approve}</button><button disabled={saving} className="btn btn-danger" onClick={() => void applyAction('reject', true)}>{text.reject}</button></>}
          {selected.application.status === 'APPROVED' && <button disabled={saving} className="btn btn-danger" onClick={() => void applyAction('suspend', true)}>{text.suspend}</button>}
          {selected.application.status === 'SUSPENDED' && <button disabled={saving} className="btn btn-success" onClick={() => void applyAction('approve')}>{text.reactivate}</button>}
        </div>
        <div><h5>{text.requirements}</h5><div className="d-flex flex-column gap-3">{selected.requirements.map((requirement) => {
          const draft = requirementDrafts[requirement.id]
          return <div key={requirement.id} className="border rounded p-3"><div className="d-flex justify-content-between gap-2"><div><strong>{requirement.label}</strong><div className="small text-muted">{requirement.category} · {requirement.mandatory ? text.mandatory : ''}</div></div></div>
            <div className="row g-2 mt-1"><div className="col-md-3"><select className="form-select" disabled={selected.application.status !== 'UNDER_REVIEW'} value={draft?.status ?? requirement.status} onChange={(event) => setRequirementDrafts({ ...requirementDrafts, [requirement.id]: { ...draft, status: event.target.value as RequirementStatus } })}>{(['PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'WAIVED'] as RequirementStatus[]).map((status) => <option key={status}>{status}</option>)}</select></div><div className="col-md-4"><input className="form-control" placeholder={text.comment} disabled={selected.application.status !== 'UNDER_REVIEW'} value={draft?.reviewComment ?? ''} onChange={(event) => setRequirementDrafts({ ...requirementDrafts, [requirement.id]: { ...draft, reviewComment: event.target.value } })} /></div><div className="col-md-3"><input className="form-control" placeholder={text.waiver} disabled={selected.application.status !== 'UNDER_REVIEW' || draft?.status !== 'WAIVED'} value={draft?.waiverReason ?? ''} onChange={(event) => setRequirementDrafts({ ...requirementDrafts, [requirement.id]: { ...draft, waiverReason: event.target.value } })} /></div><div className="col-md-2"><button className="btn btn-outline-primary w-100" disabled={saving || selected.application.status !== 'UNDER_REVIEW'} onClick={() => void saveRequirement(requirement.id)}>{text.save}</button></div></div>
          </div>
        })}</div></div>
        <div><h5>{text.documents}</h5>{selected.documents.length === 0 ? <p className="text-muted">{text.noDocuments}</p> : <ul className="list-group">{selected.documents.map((document) => <li key={document.id} className="list-group-item d-flex justify-content-between"><a href={document.fileUrl} target="_blank" rel="noreferrer">{document.fileName}</a><span className="small text-muted">v{document.version} · {document.status}</span></li>)}</ul>}</div>
        <div><h5>{text.history}</h5>{selected.history.length === 0 ? <p className="text-muted">{text.noHistory}</p> : <div className="table-responsive"><table className="table table-sm"><tbody>{selected.history.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString(locale)}</td><td>{item.action}</td><td>{item.actorRole}</td><td>{item.reason}</td></tr>)}</tbody></table></div>}</div>
      </div></div>}
    </div>
  )
}
