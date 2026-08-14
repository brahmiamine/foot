"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

type LicenseStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED" | "EXPIRED" | "REVOKED";
type PersonType = "PLAYER" | "COACH" | "STAFF" | "MEDICAL" | "DIRECTOR";
interface License { id: string; personType: PersonType; personReferenceId: string; seasonId: string; licenseType: string; licenseNumber: string | null; status: LicenseStatus; rejectionReason: string | null; expiresAt: string | null; }
interface Candidate { id: string; name: string; category: string; staffType?: string; }
interface DocumentRecord { id: string; documentType: string; fileName: string; fileUrl: string; version: number; status: string; reviewComment: string | null; }
interface HistoryRecord { id: string; action: string; actorRole: string; reason: string | null; createdAt: string; }
interface Bundle { license: License; documents: DocumentRecord[]; history: HistoryRecord[]; }

const TEXT = {
  fr: { title: "Licences individuelles", subtitle: "Déposez et suivez les licences des joueurs et membres du club.", new: "Nouvelle demande", personType: "Type de personne", person: "Personne", season: "Saison", licenseType: "Type de licence", category: "Catégorie", status: "Statut", number: "Numéro", expiry: "Expiration", open: "Ouvrir", empty: "Aucune demande.", loading: "Chargement…", documentType: "Type de pièce", upload: "Joindre une pièce", submit: "Soumettre", reopen: "Corriger le dossier", documents: "Pièces", history: "Historique", noHistory: "Aucun événement.", decision: "Décision fédérale", close: "Fermer" },
  ar: { title: "التراخيص الفردية", subtitle: "أودع وتابع تراخيص لاعبي وإطارات النادي.", new: "طلب جديد", personType: "صفة الشخص", person: "الشخص", season: "الموسم", licenseType: "نوع الترخيص", category: "الفئة", status: "الحالة", number: "الرقم", expiry: "انتهاء الصلاحية", open: "فتح", empty: "لا يوجد طلب.", loading: "جار التحميل…", documentType: "نوع الوثيقة", upload: "إرفاق وثيقة", submit: "إيداع", reopen: "تصحيح الملف", documents: "الوثائق", history: "السجل", noHistory: "لا يوجد حدث.", decision: "قرار الجامعة", close: "إغلاق" },
};
const TYPE_LABELS: Record<PersonType, { fr: string; ar: string }> = {
  PLAYER: { fr: "Joueur", ar: "لاعب" }, COACH: { fr: "Entraîneur", ar: "مدرب" }, STAFF: { fr: "Staff", ar: "إطار" }, MEDICAL: { fr: "Médical", ar: "إطار طبي" }, DIRECTOR: { fr: "Dirigeant", ar: "مسير" },
};
const BADGES: Record<LicenseStatus, string> = {
  DRAFT: "bg-secondary-subtle text-secondary", SUBMITTED: "bg-info-subtle text-info", UNDER_REVIEW: "bg-primary-subtle text-primary", APPROVED: "bg-success-subtle text-success", REJECTED: "bg-danger-subtle text-danger", SUSPENDED: "bg-warning-subtle text-warning", EXPIRED: "bg-dark-subtle text-dark", REVOKED: "bg-danger text-white",
};

export default function PersonLicensesManager() {
  const { locale } = useI18n();
  const text = TEXT[locale];
  const [licenses, setLicenses] = useState<License[]>([]);
  const [players, setPlayers] = useState<Candidate[]>([]);
  const [staff, setStaff] = useState<Candidate[]>([]);
  const [seasons, setSeasons] = useState<Array<{ id: string; nom: string }>>([]);
  const [canManage, setCanManage] = useState(false);
  const [selected, setSelected] = useState<Bundle | null>(null);
  const [form, setForm] = useState({ personType: "PLAYER" as PersonType, personReferenceId: "", seasonId: "", licenseType: "ANNUAL", category: "" });
  const [documentType, setDocumentType] = useState("IDENTITY_DOCUMENT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/admin/federation/licenses", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erreur");
      setLicenses(data.licenses); setPlayers(data.candidates.players); setStaff(data.candidates.staff); setSeasons(data.seasons); setCanManage(data.canManage);
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const candidates = useMemo(() => {
    if (form.personType === "PLAYER") return players;
    if (form.personType === "COACH") return staff.filter((person) => ["COACH", "ADJOINT", "PREPARATEUR"].includes(person.staffType ?? ""));
    if (form.personType === "MEDICAL") return staff.filter((person) => ["KINE", "MEDECIN"].includes(person.staffType ?? ""));
    return staff;
  }, [form.personType, players, staff]);
  const names = useMemo(() => new Map([...players, ...staff].map((person) => [person.id, person.name])), [players, staff]);
  const seasonNames = useMemo(() => new Map(seasons.map((season) => [season.id, season.nom])), [seasons]);

  async function open(id: string) {
    const response = await fetch(`/api/admin/federation/licenses/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "Erreur"); return; }
    setSelected(data);
  }
  async function create() {
    if (!form.personReferenceId || !form.seasonId || !form.licenseType.trim()) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/admin/federation/licenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erreur");
      await load(); await open(data.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setSaving(false); }
  }
  async function upload(file: File) {
    if (!selected) return;
    setSaving(true); setError(null);
    try {
      const formData = new FormData(); formData.set("file", file); formData.set("documentType", documentType);
      const response = await fetch(`/api/admin/federation/licenses/${selected.license.id}/documents`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erreur");
      await open(selected.license.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setSaving(false); }
  }
  async function action(name: "submit" | "reopen") {
    if (!selected) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/admin/federation/licenses/${selected.license.id}/${name}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erreur");
      await Promise.all([load(), open(selected.license.id)]);
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setSaving(false); }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div>
    {error && <div className="alert alert-danger mb-0">{error}</div>}
    {canManage && <div className="card border-0 shadow-sm"><div className="card-body"><h2 className="h6">{text.new}</h2><div className="row g-2">
      <div className="col-md-2"><label className="form-label">{text.personType}</label><select className="form-select" value={form.personType} onChange={(event) => setForm({ ...form, personType: event.target.value as PersonType, personReferenceId: "" })}>{Object.keys(TYPE_LABELS).map((type) => <option key={type} value={type}>{TYPE_LABELS[type as PersonType][locale]}</option>)}</select></div>
      <div className="col-md-3"><label className="form-label">{text.person}</label><select className="form-select" value={form.personReferenceId} onChange={(event) => setForm({ ...form, personReferenceId: event.target.value })}><option value="">—</option>{candidates.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div>
      <div className="col-md-2"><label className="form-label">{text.season}</label><select className="form-select" value={form.seasonId} onChange={(event) => setForm({ ...form, seasonId: event.target.value })}><option value="">—</option>{seasons.map((season) => <option key={season.id} value={season.id}>{season.nom}</option>)}</select></div>
      <div className="col-md-2"><label className="form-label">{text.licenseType}</label><input className="form-control" value={form.licenseType} onChange={(event) => setForm({ ...form, licenseType: event.target.value })} /></div>
      <div className="col-md-2"><label className="form-label">{text.category}</label><input className="form-control" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></div>
      <div className="col-md-1 d-flex align-items-end"><button disabled={saving || !form.personReferenceId || !form.seasonId} className="btn btn-primary w-100" onClick={() => void create()}>+</button></div>
    </div></div></div>}
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="p-4 mb-0">{text.loading}</p> : licenses.length === 0 ? <p className="p-4 mb-0 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.person}</th><th>{text.personType}</th><th>{text.season}</th><th>{text.status}</th><th>{text.number}</th><th /></tr></thead><tbody>{licenses.map((license) => <tr key={license.id}><td>{names.get(license.personReferenceId) ?? license.personReferenceId}</td><td>{TYPE_LABELS[license.personType][locale]}</td><td>{seasonNames.get(license.seasonId) ?? license.seasonId}</td><td><span className={`badge ${BADGES[license.status]}`}>{license.status}</span></td><td>{license.licenseNumber ?? "—"}</td><td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={() => void open(license.id)}>{text.open}</button></td></tr>)}</tbody></table></div>}</div></div>
    {selected && <div className="card border-primary shadow-sm"><div className="card-header bg-transparent d-flex justify-content-between"><div><strong>{names.get(selected.license.personReferenceId) ?? selected.license.personReferenceId}</strong> <span className={`badge ms-2 ${BADGES[selected.license.status]}`}>{selected.license.status}</span></div><button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      {selected.license.rejectionReason && <div className="alert alert-warning mb-0"><strong>{text.decision}:</strong> {selected.license.rejectionReason}</div>}
      <div className="row"><div className="col-md-4"><strong>{text.number}:</strong> {selected.license.licenseNumber ?? "—"}</div><div className="col-md-4"><strong>{text.expiry}:</strong> {selected.license.expiresAt ? new Date(selected.license.expiresAt).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-FR") : "—"}</div></div>
      <div><h2 className="h6">{text.documents}</h2>{selected.documents.filter((document) => document.status !== "SUPERSEDED").map((document) => <div key={document.id} className="border rounded p-2 mb-2"><a href={document.fileUrl} target="_blank" rel="noreferrer">{document.fileName} · v{document.version}</a> <span className="badge bg-light text-dark">{document.status}</span>{document.reviewComment && <div className="small text-warning">{document.reviewComment}</div>}</div>)}</div>
      {canManage && selected.license.status === "DRAFT" && <div className="d-flex gap-2 flex-wrap align-items-end"><div><label className="form-label">{text.documentType}</label><select className="form-select" value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="IDENTITY_DOCUMENT">Identité</option><option value="PHOTO">Photo</option><option value="QUALIFICATION">Qualification</option><option value="MEDICAL_CLEARANCE">Aptitude</option></select></div><label className="btn btn-outline-primary">{text.upload}<input hidden type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} /></label><button disabled={saving || !selected.documents.some((document) => document.status !== "SUPERSEDED")} className="btn btn-success" onClick={() => void action("submit")}>{text.submit}</button></div>}
      {canManage && selected.license.status === "REJECTED" && <button disabled={saving} className="btn btn-warning align-self-start" onClick={() => void action("reopen")}>{text.reopen}</button>}
      <div><h2 className="h6">{text.history}</h2>{selected.history.length === 0 ? <p className="text-muted">{text.noHistory}</p> : <ul className="list-group list-group-flush">{selected.history.map((event) => <li key={event.id} className="list-group-item px-0"><strong>{event.action}</strong> · {event.actorRole}<div className="small text-muted">{new Date(event.createdAt).toLocaleString(locale === "ar" ? "ar-TN" : "fr-FR")}{event.reason ? ` · ${event.reason}` : ""}</div></li>)}</ul>}</div>
    </div></div>}
  </div>;
}
