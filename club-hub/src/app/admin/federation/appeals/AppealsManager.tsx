"use client";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
const useLocale = useI18n;

type AppealItem = { id: string; sourceType: string; sourceId: string; grounds: string; status: string; submittedAt: string; decisionSummary?: string | null };
const SOURCE_TYPES = ["LEGAL_CASE", "DISCIPLINARY_CASE", "CLUB_SANCTION", "CLUB_LICENSE", "PERSON_LICENSE", "STADIUM_INSPECTION", "COACH_QUALIFICATION", "FINANCIAL_COMPLIANCE", "MEDICAL_ELIGIBILITY", "OTHER"];
const TEXT = {
  fr: { title: "Appels", subtitle: "Contestez une décision fédérale vous concernant.", newAppeal: "Déposer un appel", sourceType: "Type de décision contestée", sourceId: "ID de la décision", grounds: "Motifs de l'appel", submit: "Envoyer", status: "Statut", loading: "Chargement…", empty: "Aucun appel.", close: "Fermer" },
  ar: { title: "الطعون", subtitle: "الطعن في قرار فدرالي يخصك.", newAppeal: "إيداع طعن", sourceType: "نوع القرار المطعون فيه", sourceId: "معرف القرار", grounds: "أسباب الطعن", submit: "إرسال", status: "الحالة", loading: "جار التحميل…", empty: "لا يوجد طعن.", close: "إغلاق" },
} as const;

export default function AppealsManager() {
  const { locale } = useLocale(); const text = TEXT[locale as "fr" | "ar"] ?? TEXT.fr;
  const [items, setItems] = useState<AppealItem[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false); const [form, setForm] = useState({ sourceType: "CLUB_SANCTION", sourceId: "", grounds: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/admin/federation/appeals", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); setItems(data); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); } finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function submit() {
    if (!form.sourceId.trim() || !form.grounds.trim()) return;
    setSaving(true);
    try { const response = await fetch("/api/admin/federation/appeals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); setCreating(false); setForm({ sourceType: "CLUB_SANCTION", sourceId: "", grounds: "" }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); } finally { setSaving(false); }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div className="d-flex justify-content-between align-items-start"><div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div><button className="btn btn-primary" onClick={() => setCreating(true)}>{text.newAppeal}</button></div>
    {error && <div className="alert alert-danger">{error}</div>}
    {creating && <div className="card border-primary"><div className="card-body row g-2">
      <div className="col-md-4"><label className="form-label">{text.sourceType}</label><select className="form-select" value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })}>{SOURCE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
      <div className="col-md-8"><label className="form-label">{text.sourceId}</label><input className="form-control" value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })} /></div>
      <div className="col-12"><label className="form-label">{text.grounds}</label><textarea className="form-control" value={form.grounds} onChange={(e) => setForm({ ...form, grounds: e.target.value })} /></div>
      <div className="col-12 d-flex gap-2"><button disabled={saving} className="btn btn-primary" onClick={() => void submit()}>{text.submit}</button><button className="btn btn-outline-secondary" onClick={() => setCreating(false)}>{text.close}</button></div>
    </div></div>}
    <div className="card border-0 shadow-sm"><div className="card-body p-0">
      {loading ? <p className="p-4">{text.loading}</p> : items.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.sourceType}</th><th>{text.status}</th></tr></thead><tbody>
        {items.map((item) => <tr key={item.id}><td>{item.sourceType}</td><td><span className="badge bg-secondary">{item.status}</span>{item.decisionSummary ? <div className="text-muted small">{item.decisionSummary}</div> : null}</td></tr>)}
      </tbody></table></div>}
    </div></div>
  </div>;
}
