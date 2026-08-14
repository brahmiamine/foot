"use client";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
const useLocale = useI18n;

type Item = { id: string; seasonId: string; status: string; budgetForecast?: string | null; payrollForecast?: string | null; playerDebts: string; staffDebts: string; taxDebts: string; federationDebts: string; otherDebts: string; currency: string; auditedAccountsUrl?: string | null; auditorName?: string | null; reviewComment?: string | null };
type Season = { id: string; nom: string };
const EMPTY = { seasonId: "", budgetForecast: "", payrollForecast: "", playerDebts: "0", staffDebts: "0", taxDebts: "0", federationDebts: "0", otherDebts: "0", currency: "TND", auditedAccountsUrl: "", auditorName: "" };
const TEXT = {
  fr: { title: "Conformité financière", subtitle: "Déclarez votre situation financière à la fédération.", newDossier: "Nouveau dossier", season: "Compétition · saison", chooseSeason: "Choisir une saison", budget: "Budget prévisionnel", payroll: "Masse salariale prévisionnelle", playerDebts: "Dettes joueurs", staffDebts: "Dettes staff", taxDebts: "Dettes fiscales", federationDebts: "Dettes fédération", otherDebts: "Autres dettes", currency: "Devise", auditor: "Auditeur", accounts: "URL des comptes audités", save: "Enregistrer", submit: "Soumettre", status: "Statut", loading: "Chargement…", empty: "Aucun dossier.", open: "Ouvrir", close: "Fermer", comment: "Commentaire fédéral" },
  ar: { title: "المطابقة المالية", subtitle: "صرح بوضعيتك المالية للجامعة.", newDossier: "ملف جديد", season: "المسابقة · الموسم", chooseSeason: "اختر موسما", budget: "الميزانية التقديرية", payroll: "كتلة الأجور التقديرية", playerDebts: "ديون اللاعبين", staffDebts: "ديون الإطار", taxDebts: "الديون الجبائية", federationDebts: "ديون الجامعة", otherDebts: "ديون أخرى", currency: "العملة", auditor: "المدقق", accounts: "رابط الحسابات المدققة", save: "حفظ", submit: "إرسال", status: "الحالة", loading: "جار التحميل…", empty: "لا يوجد ملف.", open: "فتح", close: "إغلاق", comment: "تعليق الجامعة" },
} as const;

export default function FinancialComplianceManager() {
  const { locale } = useLocale(); const text = TEXT[locale as "fr" | "ar"] ?? TEXT.fr;
  const [items, setItems] = useState<Item[]>([]); const [seasons, setSeasons] = useState<Season[]>([]);
  const [selected, setSelected] = useState<Item | null>(null); const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null); const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/admin/federation/financial-compliance", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); setItems(data); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); } finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { void (async () => { try { const response = await fetch("/api/admin/federation/compliance", { cache: "no-store" }); const data = await response.json(); if (response.ok) setSeasons(data.seasons ?? []); } catch { /* pas bloquant */ } })(); }, []);

  async function submitDraft() {
    if (!form.seasonId) return;
    setSaving(true);
    try { const response = await fetch("/api/admin/federation/financial-compliance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); setCreating(false); setForm(EMPTY); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); } finally { setSaving(false); }
  }
  async function submitFinal(id: string) {
    setSaving(true);
    try { const response = await fetch(`/api/admin/federation/financial-compliance/${id}/submit`, { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); await load(); setSelected(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); } finally { setSaving(false); }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div className="d-flex justify-content-between align-items-start"><div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div><button className="btn btn-primary" onClick={() => setCreating(true)}>{text.newDossier}</button></div>
    {error && <div className="alert alert-danger">{error}</div>}
    {creating && <div className="card border-primary"><div className="card-body row g-2">
      <div className="col-md-6"><label className="form-label">{text.season}</label><select className="form-select" value={form.seasonId} onChange={(e) => setForm({ ...form, seasonId: e.target.value })}><option value="">{text.chooseSeason}</option>{seasons.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</select></div>
      <div className="col-md-3"><label className="form-label">{text.budget}</label><input className="form-control" value={form.budgetForecast} onChange={(e) => setForm({ ...form, budgetForecast: e.target.value })} /></div>
      <div className="col-md-3"><label className="form-label">{text.payroll}</label><input className="form-control" value={form.payrollForecast} onChange={(e) => setForm({ ...form, payrollForecast: e.target.value })} /></div>
      <div className="col-md-3"><label className="form-label">{text.playerDebts}</label><input className="form-control" value={form.playerDebts} onChange={(e) => setForm({ ...form, playerDebts: e.target.value })} /></div>
      <div className="col-md-3"><label className="form-label">{text.staffDebts}</label><input className="form-control" value={form.staffDebts} onChange={(e) => setForm({ ...form, staffDebts: e.target.value })} /></div>
      <div className="col-md-3"><label className="form-label">{text.taxDebts}</label><input className="form-control" value={form.taxDebts} onChange={(e) => setForm({ ...form, taxDebts: e.target.value })} /></div>
      <div className="col-md-3"><label className="form-label">{text.federationDebts}</label><input className="form-control" value={form.federationDebts} onChange={(e) => setForm({ ...form, federationDebts: e.target.value })} /></div>
      <div className="col-md-3"><label className="form-label">{text.otherDebts}</label><input className="form-control" value={form.otherDebts} onChange={(e) => setForm({ ...form, otherDebts: e.target.value })} /></div>
      <div className="col-md-3"><label className="form-label">{text.currency}</label><input className="form-control" maxLength={3} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
      <div className="col-md-6"><label className="form-label">{text.auditor}</label><input className="form-control" value={form.auditorName} onChange={(e) => setForm({ ...form, auditorName: e.target.value })} /></div>
      <div className="col-md-6"><label className="form-label">{text.accounts}</label><input className="form-control" value={form.auditedAccountsUrl} onChange={(e) => setForm({ ...form, auditedAccountsUrl: e.target.value })} /></div>
      <div className="col-12 d-flex gap-2"><button disabled={saving} className="btn btn-primary" onClick={() => void submitDraft()}>{text.save}</button><button className="btn btn-outline-secondary" onClick={() => setCreating(false)}>{text.close}</button></div>
    </div></div>}
    <div className="card border-0 shadow-sm"><div className="card-body p-0">
      {loading ? <p className="p-4">{text.loading}</p> : items.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.season}</th><th>{text.status}</th><th /></tr></thead><tbody>
        {items.map((item) => <tr key={item.id}><td>{item.seasonId}</td><td><span className="badge bg-secondary">{item.status}</span></td><td><button className="btn btn-sm btn-outline-primary" onClick={() => setSelected(item)}>{text.open}</button></td></tr>)}
      </tbody></table></div>}
    </div></div>
    {selected && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{selected.status}</strong><button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-2">
      {selected.reviewComment && <div className="alert alert-info">{text.comment}: {selected.reviewComment}</div>}
      {selected.status === "DRAFT" && <button disabled={saving} className="btn btn-primary align-self-start" onClick={() => void submitFinal(selected.id)}>{text.submit}</button>}
    </div></div>}
  </div>;
}
