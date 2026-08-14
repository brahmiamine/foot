"use client";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
const useLocale = useI18n;

type Qualification = { id: string; staffId: string; qualificationType: string; status: string; licenseNumber?: string | null; expiresAt?: string | null };
type Staff = { id: string; name: string };
const TYPES = ["CAF_PRO", "CAF_A", "CAF_B", "CAF_C", "NATIONAL", "OTHER"];
const TEXT = {
  fr: { title: "Qualifications entraîneurs", subtitle: "Soumettez les diplômes techniques (CAF) de votre staff pour validation fédérale.", newSubmission: "Nouvelle qualification", staff: "Membre du staff", chooseStaff: "Choisir un membre", type: "Niveau", licenseNumber: "Numéro de licence", submit: "Soumettre", status: "Statut", loading: "Chargement…", empty: "Aucune qualification.", close: "Fermer" },
  ar: { title: "تأهيل المدربين", subtitle: "أرسل الشهادات الفنية (CAF) لإطارك للمصادقة الفدرالية.", newSubmission: "تأهيل جديد", staff: "عضو الإطار", chooseStaff: "اختر عضوا", type: "المستوى", licenseNumber: "رقم الرخصة", submit: "إرسال", status: "الحالة", loading: "جار التحميل…", empty: "لا يوجد تأهيل.", close: "إغلاق" },
} as const;

export default function CoachQualificationsManager() {
  const { locale } = useLocale(); const text = TEXT[locale as "fr" | "ar"] ?? TEXT.fr;
  const [items, setItems] = useState<Qualification[]>([]); const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false); const [form, setForm] = useState({ staffId: "", qualificationType: "CAF_C", licenseNumber: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/admin/federation/coach-qualifications", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); setItems(data); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); } finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { void (async () => { try { const response = await fetch("/api/admin/federation/staff-contracts", { cache: "no-store" }); const data = await response.json(); if (response.ok) setStaff(data.staff ?? []); } catch { /* pas bloquant */ } })(); }, []);

  async function submit() {
    if (!form.staffId) return;
    setSaving(true);
    try { const response = await fetch("/api/admin/federation/coach-qualifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); setCreating(false); setForm({ staffId: "", qualificationType: "CAF_C", licenseNumber: "" }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); } finally { setSaving(false); }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div className="d-flex justify-content-between align-items-start"><div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div><button className="btn btn-primary" onClick={() => setCreating(true)}>{text.newSubmission}</button></div>
    {error && <div className="alert alert-danger">{error}</div>}
    {creating && <div className="card border-primary"><div className="card-body row g-2">
      <div className="col-md-6"><label className="form-label">{text.staff}</label><select className="form-select" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}><option value="">{text.chooseStaff}</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      <div className="col-md-3"><label className="form-label">{text.type}</label><select className="form-select" value={form.qualificationType} onChange={(e) => setForm({ ...form, qualificationType: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
      <div className="col-md-3"><label className="form-label">{text.licenseNumber}</label><input className="form-control" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} /></div>
      <div className="col-12 d-flex gap-2"><button disabled={saving} className="btn btn-primary" onClick={() => void submit()}>{text.submit}</button><button className="btn btn-outline-secondary" onClick={() => setCreating(false)}>{text.close}</button></div>
    </div></div>}
    <div className="card border-0 shadow-sm"><div className="card-body p-0">
      {loading ? <p className="p-4">{text.loading}</p> : items.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.type}</th><th>{text.status}</th></tr></thead><tbody>
        {items.map((item) => <tr key={item.id}><td>{item.qualificationType}</td><td><span className="badge bg-secondary">{item.status}</span></td></tr>)}
      </tbody></table></div>}
    </div></div>
  </div>;
}
