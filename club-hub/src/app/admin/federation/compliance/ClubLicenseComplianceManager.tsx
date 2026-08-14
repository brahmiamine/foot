"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

type ApplicationStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED" | "SUSPENDED" | "EXPIRED";
interface Application { id: string; seasonId: string; status: ApplicationStatus; rejectionReason: string | null; updatedAt: string; }
interface Season { id: string; nom: string; dateDebut: string | null; dateFin: string | null; }
interface Requirement { id: string; category: string; code: string; label: string; description: string | null; mandatory: boolean; status: string; reviewComment: string | null; }
interface DocumentRecord { id: string; requirementId: string | null; fileUrl: string; fileName: string; status: string; version: number; }
interface HistoryRecord { id: string; action: string; actorRole: string; reason: string | null; createdAt: string; }
interface Bundle { application: Application; requirements: Requirement[]; documents: DocumentRecord[]; history: HistoryRecord[]; }

const STATUS_BADGES: Record<ApplicationStatus, string> = {
  DRAFT: "bg-secondary-subtle text-secondary", SUBMITTED: "bg-info-subtle text-info", UNDER_REVIEW: "bg-primary-subtle text-primary",
  CHANGES_REQUESTED: "bg-warning-subtle text-warning", APPROVED: "bg-success-subtle text-success", REJECTED: "bg-danger-subtle text-danger",
  SUSPENDED: "bg-danger-subtle text-danger", EXPIRED: "bg-dark-subtle text-dark",
};

const TEXT = {
  fr: {
    title: "Dossier fédéral — conformité du club", subtitle: "Préparez les pièces, déposez le dossier et suivez la décision de la fédération.",
    new: "Nouveau dossier", season: "Saison", choose: "Choisir une saison", create: "Créer le brouillon", loading: "Chargement…", empty: "Aucun dossier créé.",
    open: "Ouvrir", status: "Statut", progress: "Progression", requirements: "Exigences", mandatory: "obligatoire", upload: "Joindre / remplacer", uploading: "Envoi…",
    documents: "Documents", history: "Historique", submit: "Soumettre à la fédération", missing: "Document manquant", received: "Pièce jointe", comment: "Observation fédérale",
    noHistory: "Aucun événement.", close: "Fermer", decision: "Décision / observation", readOnly: "Le dossier est verrouillé pendant son examen.",
  },
  ar: {
    title: "الملف الجامعي — امتثال النادي", subtitle: "حضّر الوثائق وأودع الملف وتابع قرار الجامعة.",
    new: "ملف جديد", season: "الموسم", choose: "اختر موسما", create: "إنشاء المسودة", loading: "جار التحميل…", empty: "لم يتم إنشاء أي ملف.",
    open: "فتح", status: "الحالة", progress: "نسبة التقدم", requirements: "المتطلبات", mandatory: "إجباري", upload: "إرفاق / استبدال", uploading: "جار الإرسال…",
    documents: "الوثائق", history: "السجل", submit: "إيداع الملف لدى الجامعة", missing: "الوثيقة ناقصة", received: "الوثيقة مرفقة", comment: "ملاحظة الجامعة",
    noHistory: "لا يوجد حدث.", close: "إغلاق", decision: "القرار / الملاحظة", readOnly: "الملف مقفل أثناء دراسته.",
  },
};

export default function ClubLicenseComplianceManager() {
  const { locale } = useI18n();
  const text = TEXT[locale];
  const [applications, setApplications] = useState<Application[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selected, setSelected] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusLabels: Record<ApplicationStatus, string> = locale === "ar"
    ? { DRAFT: "مسودة", SUBMITTED: "مودع", UNDER_REVIEW: "قيد الدراسة", CHANGES_REQUESTED: "تعديلات مطلوبة", APPROVED: "مقبول", REJECTED: "مرفوض", SUSPENDED: "معلق", EXPIRED: "منتهي" }
    : { DRAFT: "Brouillon", SUBMITTED: "Soumis", UNDER_REVIEW: "En examen", CHANGES_REQUESTED: "Corrections demandées", APPROVED: "Approuvé", REJECTED: "Rejeté", SUSPENDED: "Suspendu", EXPIRED: "Expiré" };

  const editable = selected?.application.status === "DRAFT" || selected?.application.status === "CHANGES_REQUESTED";

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/federation/compliance", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erreur");
      setApplications(data.applications);
      setSeasons(data.seasons);
      setCanManage(data.canManage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  async function openApplication(id: string) {
    setError(null);
    const response = await fetch(`/api/admin/federation/compliance/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "Erreur"); return; }
    setSelected(data);
  }

  useEffect(() => {
    queueMicrotask(() => void loadList());
  }, [loadList]);

  const seasonNames = useMemo(() => new Map(seasons.map((season) => [season.id, season.nom])), [seasons]);
  const documentsByRequirement = useMemo(() => {
    const map = new Map<string, DocumentRecord>();
    for (const document of selected?.documents ?? []) {
      if (document.requirementId && document.status !== "SUPERSEDED" && !map.has(document.requirementId)) map.set(document.requirementId, document);
    }
    return map;
  }, [selected]);
  const progress = useMemo(() => {
    const mandatory = selected?.requirements.filter((requirement) => requirement.mandatory) ?? [];
    if (!mandatory.length) return 0;
    return Math.round((mandatory.filter((requirement) => documentsByRequirement.has(requirement.id)).length / mandatory.length) * 100);
  }, [selected, documentsByRequirement]);

  async function createApplication() {
    if (!selectedSeason) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/admin/federation/compliance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seasonId: selectedSeason }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erreur");
      await loadList(); await openApplication(data.id); setSelectedSeason("");
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setSaving(false); }
  }

  async function uploadDocument(requirement: Requirement, file: File) {
    if (!selected) return;
    setUploadingId(requirement.id); setError(null);
    try {
      const form = new FormData(); form.set("file", file); form.set("requirementId", requirement.id); form.set("documentType", requirement.code);
      const response = await fetch(`/api/admin/federation/compliance/${selected.application.id}/documents`, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erreur");
      await openApplication(selected.application.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setUploadingId(null); }
  }

  async function submitApplication() {
    if (!selected) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/admin/federation/compliance/${selected.application.id}/submit`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erreur");
      await Promise.all([loadList(), openApplication(selected.application.id)]);
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setSaving(false); }
  }

  return (
    <div className="container-fluid px-0 d-flex flex-column gap-4">
      <div>
        <h1 className="h4 mb-1">{text.title}</h1>
        <p className="text-muted mb-0">{text.subtitle}</p>
      </div>
      {error && <div className="alert alert-danger mb-0">{error}</div>}
      {canManage && (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h6">{text.new}</h2>
            <div className="row g-2 align-items-end">
              <div className="col-md-6">
                <label className="form-label">{text.season}</label>
                <select className="form-select" value={selectedSeason} onChange={(event) => setSelectedSeason(event.target.value)}>
                  <option value="">{text.choose}</option>
                  {seasons.map((season) => <option key={season.id} value={season.id}>{season.nom}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <button disabled={!selectedSeason || saving} className="btn btn-primary w-100" onClick={() => void createApplication()}>{text.create}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? <p className="p-4 text-muted mb-0">{text.loading}</p> : applications.length === 0 ? <p className="p-4 text-muted mb-0">{text.empty}</p> : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead><tr><th>{text.season}</th><th>{text.status}</th><th /></tr></thead>
                <tbody>{applications.map((application) => (
                  <tr key={application.id}>
                    <td>{seasonNames.get(application.seasonId) ?? application.seasonId}</td>
                    <td><span className={`badge ${STATUS_BADGES[application.status]}`}>{statusLabels[application.status]}</span></td>
                    <td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={() => void openApplication(application.id)}>{text.open}</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {selected && (
        <div className="card border-primary shadow-sm">
          <div className="card-header bg-transparent d-flex justify-content-between">
            <div><strong>{seasonNames.get(selected.application.seasonId)}</strong><span className={`badge ms-2 ${STATUS_BADGES[selected.application.status]}`}>{statusLabels[selected.application.status]}</span></div>
            <button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} />
          </div>
          <div className="card-body d-flex flex-column gap-4">
            {selected.application.rejectionReason && <div className="alert alert-warning mb-0"><strong>{text.decision} :</strong> {selected.application.rejectionReason}</div>}
            <div><div className="d-flex justify-content-between small mb-1"><span>{text.progress}</span><span>{progress}%</span></div><div className="progress"><div className="progress-bar" style={{ width: `${progress}%` }} /></div></div>
            {!editable && <div className="alert alert-info mb-0">{text.readOnly}</div>}
            <div>
              <h2 className="h5">{text.requirements}</h2>
              <div className="d-flex flex-column gap-3">
                {selected.requirements.map((requirement) => {
                  const document = documentsByRequirement.get(requirement.id);
                  return (
                    <div className="border rounded p-3" key={requirement.id}>
                      <div className="d-flex justify-content-between gap-2 flex-wrap">
                        <div>
                          <strong>{requirement.label}</strong>
                          <div className="small text-muted">{requirement.category}{requirement.mandatory ? ` · ${text.mandatory}` : ""}</div>
                          <p className="small mb-1 mt-2">{requirement.description}</p>
                          {requirement.reviewComment && <div className="small text-warning"><strong>{text.comment} :</strong> {requirement.reviewComment}</div>}
                        </div>
                        <span className={`badge align-self-start ${document ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"}`}>{document ? text.received : text.missing}</span>
                      </div>
                      {document && <a className="small" href={document.fileUrl} target="_blank" rel="noreferrer">{document.fileName} · v{document.version}</a>}
                      {canManage && editable && (
                        <div className="mt-3">
                          <label className={`btn btn-sm btn-outline-primary ${uploadingId === requirement.id ? "disabled" : ""}`}>
                            {uploadingId === requirement.id ? text.uploading : text.upload}
                            <input hidden type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={uploadingId === requirement.id} onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void uploadDocument(requirement, file);
                              event.currentTarget.value = "";
                            }} />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {canManage && editable && <button disabled={saving || progress < 100} className="btn btn-success align-self-start" onClick={() => void submitApplication()}>{text.submit}</button>}
            <div>
              <h2 className="h5">{text.history}</h2>
              {selected.history.length === 0 ? <p className="text-muted">{text.noHistory}</p> : (
                <div className="table-responsive"><table className="table table-sm"><tbody>{selected.history.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString(locale)}</td><td>{item.action}</td><td>{item.actorRole}</td><td>{item.reason}</td></tr>)}</tbody></table></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
