"use client";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
const useLocale = useI18n;

type Eligibility = { id: string; status: string; examinationDate: string; expiresAt?: string | null; certificateReference?: string | null };
type Candidate = { id: string; name: string };
type Season = { id: string; nom: string };
const TEXT = {
  fr: { title: 'Aptitude médicale', subtitle: "Déposez le certificat médical d'aptitude de vos joueurs pour validation fédérale (statut uniquement, aucun diagnostic transmis).", newSubmission: "Nouveau certificat", player: "Joueur", choosePlayer: "Choisir un joueur", season: "Compétition · saison", chooseSeason: "Choisir une saison", examinationDate: "Date d'examen", certificateReference: "Référence certificat", submit: "Envoyer", status: "Statut", loading: "Chargement…", empty: "Aucun dossier.", close: "Fermer" },
  ar: { title: "الأهلية الطبية", subtitle: "أرسل الشهادة الطبية للاعبيك للمصادقة الفدرالية (الحالة فقط، دون تشخيص).", newSubmission: "شهادة جديدة", player: "اللاعب", choosePlayer: "اختر لاعبا", season: "المسابقة · الموسم", chooseSeason: "اختر موسما", examinationDate: "تاريخ الفحص", certificateReference: "مرجع الشهادة", submit: "إرسال", status: "الحالة", loading: "جار التحميل…", empty: "لا يوجد ملف.", close: "إغلاق" },
} as const;

export default function MedicalEligibilityManager() {
  const { locale } = useLocale(); const text = TEXT[locale as "fr" | "ar"] ?? TEXT.fr;
  const [items, setItems] = useState<Eligibility[]>([]); const [candidates, setCandidates] = useState<Candidate[]>([]); const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false); const [form, setForm] = useState({ playerId: "", seasonId: "", examinationDate: "", certificateReference: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/admin/federation/medical-eligibility", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); setItems(data); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); } finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { void (async () => { try { const response = await fetch("/api/admin/federation/registrations", { cache: "no-store" }); const data = await response.json(); if (response.ok) { setCandidates(data.candidates ?? []); setSeasons(data.seasons ?? []); } } catch { /* pas bloquant */ } })(); }, []);

  async function submit() {
    if (!form.playerId || !form.seasonId || !form.examinationDate) return;
    setSaving(true);
    try { const response = await fetch("/api/admin/federation/medical-eligibility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); setCreating(false); setForm({ playerId: "", seasonId: "", examinationDate: "", certificateReference: "" }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); } finally { setSaving(false); }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div className="d-flex justify-content-between align-items-start"><div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div><button className="btn btn-primary" onClick={() => setCreating(true)}>{text.newSubmission}</button></div>
    {error && <div className="alert alert-danger">{error}</div>}
    {creating && <div className="card border-primary"><div className="card-body row g-2">
      <div className="col-md-4"><label className="form-label">{text.player}</label><select className="form-select" value={form.playerId} onChange={(e) => setForm({ ...form, playerId: e.target.value })}><option value="">{text.choosePlayer}</option>{candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label">{text.season}</label><select className="form-select" value={form.seasonId} onChange={(e) => setForm({ ...form, seasonId: e.target.value })}><option value="">{text.chooseSeason}</option>{seasons.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label">{text.examinationDate}</label><input type="date" className="form-control" value={form.examinationDate} onChange={(e) => setForm({ ...form, examinationDate: e.target.value })} /></div>
      <div className="col-md-6"><label className="form-label">{text.certificateReference}</label><input className="form-control" value={form.certificateReference} onChange={(e) => setForm({ ...form, certificateReference: e.target.value })} /></div>
      <div className="col-12 d-flex gap-2"><button disabled={saving} className="btn btn-primary" onClick={() => void submit()}>{text.submit}</button><button className="btn btn-outline-secondary" onClick={() => setCreating(false)}>{text.close}</button></div>
    </div></div>}
    <div className="card border-0 shadow-sm"><div className="card-body p-0">
      {loading ? <p className="p-4">{text.loading}</p> : items.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.examinationDate}</th><th>{text.status}</th></tr></thead><tbody>
        {items.map((item) => <tr key={item.id}><td>{new Date(item.examinationDate).toLocaleDateString()}</td><td><span className={`badge ${item.status === "FIT" ? "bg-success" : item.status === "UNFIT" ? "bg-danger" : "bg-secondary"}`}>{item.status}</span></td></tr>)}
      </tbody></table></div>}
    </div></div>
  </div>;
}
