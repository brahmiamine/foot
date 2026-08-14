'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'

type LicenseStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED'
interface License { id: string; personType: string; personName: string; personReferenceId: string; clubId: string | null; seasonId: string; licenseType: string; licenseNumber: string | null; category: string | null; status: LicenseStatus; expiresAt: string | null; rejectionReason: string | null; }
interface DocumentRecord { id: string; documentType: string; fileName: string; fileUrl: string; version: number; status: string; reviewComment: string | null; }
interface HistoryRecord { id: string; action: string; actorRole: string; reason: string | null; createdAt: string; }
interface Bundle { license: License; documents: DocumentRecord[]; history: HistoryRecord[]; }

const STATUSES: LicenseStatus[] = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'EXPIRED', 'REVOKED']
const PERSON_TYPES = ['PLAYER', 'COACH', 'STAFF', 'MEDICAL', 'DIRECTOR', 'REFEREE', 'MATCH_OFFICIAL']
const BADGES: Record<LicenseStatus, string> = { DRAFT: 'bg-secondary-subtle text-secondary', SUBMITTED: 'bg-info-subtle text-info', UNDER_REVIEW: 'bg-primary-subtle text-primary', APPROVED: 'bg-success-subtle text-success', REJECTED: 'bg-danger-subtle text-danger', SUSPENDED: 'bg-warning-subtle text-warning', EXPIRED: 'bg-dark-subtle text-dark', REVOKED: 'bg-danger text-white' }
const TEXT = {
  fr: { title: 'Licences individuelles', subtitle: 'Examiner, valider, suspendre ou révoquer les licences des personnes.', all: 'Tous', person: 'Personne', type: 'Type', licenseType: 'Licence', number: 'Numéro', status: 'Statut', open: 'Examiner', loading: 'Chargement…', empty: 'Aucune licence dans votre périmètre.', documents: 'Pièces', history: 'Historique', accept: 'Accepter', rejectDocument: 'Rejeter la pièce', start: 'Commencer l’examen', approve: 'Approuver', reject: 'Rejeter', suspend: 'Suspendre', reactivate: 'Réactiver', revoke: 'Révoquer', noDocuments: 'Aucune pièce.', noHistory: 'Aucun événement.', close: 'Fermer', reason: 'Motif obligatoire', documentComment: 'Observation sur la pièce', licenseNumber: 'Numéro de licence', expiresAt: 'Date d’expiration (AAAA-MM-JJ)' },
  ar: { title: 'التراخيص الفردية', subtitle: 'دراسة تراخيص الأشخاص والموافقة عليها أو تعليقها أو سحبها.', all: 'الكل', person: 'الشخص', type: 'الصفة', licenseType: 'الترخيص', number: 'الرقم', status: 'الحالة', open: 'دراسة', loading: 'جار التحميل…', empty: 'لا يوجد ترخيص ضمن نطاقك.', documents: 'الوثائق', history: 'السجل', accept: 'قبول', rejectDocument: 'رفض الوثيقة', start: 'بدء الدراسة', approve: 'موافقة', reject: 'رفض', suspend: 'تعليق', reactivate: 'إعادة التفعيل', revoke: 'سحب', noDocuments: 'لا توجد وثيقة.', noHistory: 'لا يوجد حدث.', close: 'إغلاق', reason: 'السبب إجباري', documentComment: 'ملاحظة حول الوثيقة', licenseNumber: 'رقم الترخيص', expiresAt: 'تاريخ انتهاء الصلاحية (YYYY-MM-DD)' },
  en: { title: 'Individual licenses', subtitle: 'Review, approve, suspend or revoke person licenses.', all: 'All', person: 'Person', type: 'Type', licenseType: 'License', number: 'Number', status: 'Status', open: 'Review', loading: 'Loading…', empty: 'No license in your scope.', documents: 'Documents', history: 'History', accept: 'Accept', rejectDocument: 'Reject document', start: 'Start review', approve: 'Approve', reject: 'Reject', suspend: 'Suspend', reactivate: 'Reactivate', revoke: 'Revoke', noDocuments: 'No document.', noHistory: 'No event.', close: 'Close', reason: 'Reason is required', documentComment: 'Document comment', licenseNumber: 'License number', expiresAt: 'Expiration date (YYYY-MM-DD)' },
}

export default function AdminPersonLicensesManager() {
  const { locale } = useTranslations()
  const text = TEXT[locale]
  const [licenses, setLicenses] = useState<License[]>([])
  const [selected, setSelected] = useState<Bundle | null>(null)
  const [status, setStatus] = useState('')
  const [personType, setPersonType] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const query = new URLSearchParams()
      if (status) query.set('status', status)
      if (personType) query.set('personType', personType)
      const response = await fetch(`/api/admin/licenses?${query}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setLicenses(data)
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') }
    finally { setLoading(false) }
  }, [status, personType])
  useEffect(() => { void load() }, [load])

  async function open(id: string) {
    const response = await fetch(`/api/admin/licenses/${id}`, { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) { setError(data.error ?? 'Erreur'); return }
    setSelected(data)
  }

  async function action(name: string) {
    if (!selected) return
    const payload: Record<string, string> = {}
    if (name === 'approve') {
      const number = window.prompt(text.licenseNumber, selected.license.licenseNumber ?? '')
      if (!number?.trim()) return
      const expiresAt = window.prompt(text.expiresAt, selected.license.expiresAt?.slice(0, 10) ?? '')
      payload.licenseNumber = number
      if (expiresAt?.trim()) payload.expiresAt = expiresAt
    }
    if (['reject', 'suspend', 'revoke'].includes(name)) {
      const reason = window.prompt(text.reason)
      if (!reason?.trim()) return
      payload.reason = reason
    }
    setSaving(true); setError(null)
    try {
      const response = await fetch(`/api/admin/licenses/${selected.license.id}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      await Promise.all([load(), open(selected.license.id)])
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') }
    finally { setSaving(false) }
  }

  async function reviewDocument(documentId: string, documentStatus: 'ACCEPTED' | 'REJECTED') {
    if (!selected) return
    const reviewComment = documentStatus === 'REJECTED' ? window.prompt(text.documentComment) : null
    if (documentStatus === 'REJECTED' && !reviewComment?.trim()) return
    setSaving(true); setError(null)
    try {
      const response = await fetch(`/api/admin/licenses/${selected.license.id}/documents/${documentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: documentStatus, reviewComment }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      await open(selected.license.id)
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') }
    finally { setSaving(false) }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div>
    {error && <div className="alert alert-danger mb-0">{error}</div>}
    <div className="card border-0 shadow-sm"><div className="card-body"><div className="row g-2"><div className="col-md-3"><label className="form-label">{text.status}</label><select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{text.all}</option>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select></div><div className="col-md-3"><label className="form-label">{text.type}</label><select className="form-select" value={personType} onChange={(event) => setPersonType(event.target.value)}><option value="">{text.all}</option>{PERSON_TYPES.map((value) => <option key={value}>{value}</option>)}</select></div></div></div></div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="p-4 mb-0">{text.loading}</p> : licenses.length === 0 ? <p className="p-4 mb-0 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.person}</th><th>{text.type}</th><th>{text.licenseType}</th><th>{text.number}</th><th>{text.status}</th><th /></tr></thead><tbody>{licenses.map((license) => <tr key={license.id}><td>{license.personName}</td><td>{license.personType}</td><td>{license.licenseType}</td><td>{license.licenseNumber ?? '—'}</td><td><span className={`badge ${BADGES[license.status]}`}>{license.status}</span></td><td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={() => void open(license.id)}>{text.open}</button></td></tr>)}</tbody></table></div>}</div></div>
    {selected && <div className="card border-primary shadow-sm"><div className="card-header bg-transparent d-flex justify-content-between"><div><strong>{selected.license.personName}</strong> <span className={`badge ms-2 ${BADGES[selected.license.status]}`}>{selected.license.status}</span></div><button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      {selected.license.rejectionReason && <div className="alert alert-warning mb-0">{selected.license.rejectionReason}</div>}
      <div><strong>{text.number}:</strong> {selected.license.licenseNumber ?? '—'} · <strong>{text.licenseType}:</strong> {selected.license.licenseType}</div>
      <div><h2 className="h6">{text.documents}</h2>{selected.documents.filter((document) => document.status !== 'SUPERSEDED').length === 0 ? <p className="text-muted">{text.noDocuments}</p> : selected.documents.filter((document) => document.status !== 'SUPERSEDED').map((document) => <div key={document.id} className="border rounded p-3 mb-2"><div className="d-flex justify-content-between gap-2"><a href={document.fileUrl} target="_blank" rel="noreferrer">{document.documentType} · {document.fileName} · v{document.version}</a><span className="badge bg-light text-dark">{document.status}</span></div>{document.reviewComment && <div className="small text-warning">{document.reviewComment}</div>}{selected.license.status === 'UNDER_REVIEW' && <div className="mt-2 d-flex gap-2"><button disabled={saving} className="btn btn-sm btn-success" onClick={() => void reviewDocument(document.id, 'ACCEPTED')}>{text.accept}</button><button disabled={saving} className="btn btn-sm btn-outline-danger" onClick={() => void reviewDocument(document.id, 'REJECTED')}>{text.rejectDocument}</button></div>}</div>)}</div>
      <div className="d-flex gap-2 flex-wrap">{selected.license.status === 'SUBMITTED' && <button disabled={saving} className="btn btn-primary" onClick={() => void action('start-review')}>{text.start}</button>}{selected.license.status === 'UNDER_REVIEW' && <><button disabled={saving} className="btn btn-success" onClick={() => void action('approve')}>{text.approve}</button><button disabled={saving} className="btn btn-outline-danger" onClick={() => void action('reject')}>{text.reject}</button></>}{selected.license.status === 'APPROVED' && <><button disabled={saving} className="btn btn-warning" onClick={() => void action('suspend')}>{text.suspend}</button><button disabled={saving} className="btn btn-danger" onClick={() => void action('revoke')}>{text.revoke}</button></>}{selected.license.status === 'SUSPENDED' && <><button disabled={saving} className="btn btn-success" onClick={() => void action('reactivate')}>{text.reactivate}</button><button disabled={saving} className="btn btn-danger" onClick={() => void action('revoke')}>{text.revoke}</button></>}</div>
      <div><h2 className="h6">{text.history}</h2>{selected.history.length === 0 ? <p className="text-muted">{text.noHistory}</p> : <ul className="list-group list-group-flush">{selected.history.map((event) => <li key={event.id} className="list-group-item px-0"><strong>{event.action}</strong> · {event.actorRole}<div className="small text-muted">{new Date(event.createdAt).toLocaleString(locale === 'ar' ? 'ar-TN' : locale === 'fr' ? 'fr-FR' : 'en-GB')}{event.reason ? ` · ${event.reason}` : ''}</div></li>)}</ul>}</div>
    </div></div>}
  </div>
}
