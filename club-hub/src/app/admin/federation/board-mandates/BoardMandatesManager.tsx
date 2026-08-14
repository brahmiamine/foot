"use client";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
const useLocale = useI18n;

type Mandate = { id: string; status: string; startsAt: string; endsAt: string; rejectionReason?: string | null };
type Member = { id: string; personName: string; role: string; federationApproved: boolean };
type Bundle = { mandate: Mandate; members: Member[]; history: Array<{ id: string; action: string }> };
const ROLES = ["PRESIDENT", "VICE_PRESIDENT", "GENERAL_SECRETARY", "TREASURER", "BOARD_MEMBER", "OTHER"];
const TEXT = {
  fr: { title: "Gouvernance", subtitle: "Déclarez le comité directeur de votre club à la fédération.", newMandate: "Nouveau mandat", startsAt: "Début", endsAt: "Fin", create: "Créer", loading: "Chargement…", empty: "Aucun mandat.", open: "Ouvrir", close: "Fermer", status: "Statut", addMember: "Ajouter un membre", name: "Nom", role: "Rôle", submit: "Soumettre", approved: "Approuvé", pending: "En attente" },
  ar: { title: "الحوكمة", subtitle: "صرح بالمكتب المدير لناديك للجامعة.", newMandate: "عهدة جديدة", startsAt: "البداية", endsAt: "النهاية", create: "إنشاء", loading: "جار التحميل…", empty: "لا توجد عهدة.", open: "فتح", close: "إغلاق", status: "الحالة", addMember: "إضافة عضو", name: "الاسم", role: "الدور", submit: "إرسال", approved: "تمت الموافقة", pending: "قيد الانتظار" },
} as const;

export default function BoardMandatesManager() {
  const { locale } = useLocale(); const text = TEXT[locale as "fr" | "ar"] ?? TEXT.fr;
  const [mandates, setMandates] = useState<Mandate[]>([]); const [selected, setSelected] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false); const [form, setForm] = useState({ startsAt: "", endsAt: "" });
  const [addingMember, setAddingMember] = useState(false); const [memberForm, setMemberForm] = useState({ personName: "", role: "PRESIDENT", startsAt: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/admin/federation/board-mandates", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); setMandates(data); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); } finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function open(id: string) { const response = await fetch(`/api/admin/federation/board-mandates/${id}`, { cache: "no-store" }); const data = await response.json(); if (!response.ok) return setError(data.error ?? "Erreur"); setSelected(data); }
  async function createMandate() {
    if (!form.startsAt || !form.endsAt) return;
    setSaving(true);
    try { const response = await fetch("/api/admin/federation/board-mandates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); setCreating(false); setForm({ startsAt: "", endsAt: "" }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); } finally { setSaving(false); }
  }
  async function addMember() {
    if (!selected || !memberForm.personName.trim() || !memberForm.startsAt) return;
    setSaving(true);
    try { const response = await fetch(`/api/admin/federation/board-mandates/${selected.mandate.id}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(memberForm) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); setAddingMember(false); setMemberForm({ personName: "", role: "PRESIDENT", startsAt: "" }); await open(selected.mandate.id); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); } finally { setSaving(false); }
  }
  async function submit() {
    if (!selected) return;
    setSaving(true);
    try { const response = await fetch(`/api/admin/federation/board-mandates/${selected.mandate.id}/submit`, { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); await Promise.all([load(), open(selected.mandate.id)]); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); } finally { setSaving(false); }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div className="d-flex justify-content-between align-items-start"><div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div><button className="btn btn-primary" onClick={() => setCreating(true)}>{text.newMandate}</button></div>
    {error && <div className="alert alert-danger">{error}</div>}
    {creating && <div className="card border-primary"><div className="card-body row g-2">
      <div className="col-md-6"><label className="form-label">{text.startsAt}</label><input type="date" className="form-control" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
      <div className="col-md-6"><label className="form-label">{text.endsAt}</label><input type="date" className="form-control" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></div>
      <div className="col-12 d-flex gap-2"><button disabled={saving} className="btn btn-primary" onClick={() => void createMandate()}>{text.create}</button><button className="btn btn-outline-secondary" onClick={() => setCreating(false)}>{text.close}</button></div>
    </div></div>}
    <div className="card border-0 shadow-sm"><div className="card-body p-0">
      {loading ? <p className="p-4">{text.loading}</p> : mandates.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.startsAt}</th><th>{text.endsAt}</th><th>{text.status}</th><th /></tr></thead><tbody>
        {mandates.map((item) => <tr key={item.id}><td>{new Date(item.startsAt).toLocaleDateString()}</td><td>{new Date(item.endsAt).toLocaleDateString()}</td><td><span className="badge bg-secondary">{item.status}</span></td><td><button className="btn btn-sm btn-outline-primary" onClick={() => void open(item.id)}>{text.open}</button></td></tr>)}
      </tbody></table></div>}
    </div></div>
    {selected && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{selected.mandate.status}</strong><button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      {selected.mandate.rejectionReason && <div className="alert alert-warning">{selected.mandate.rejectionReason}</div>}
      <div className="table-responsive"><table className="table table-sm mb-0"><tbody>{selected.members.map((member) => <tr key={member.id}><td>{member.personName}</td><td>{member.role}</td><td><span className={`badge ${member.federationApproved ? "bg-success" : "bg-secondary"}`}>{member.federationApproved ? text.approved : text.pending}</span></td></tr>)}</tbody></table></div>
      {selected.mandate.status === "DRAFT" && <>
        {!addingMember ? <button className="btn btn-sm btn-outline-primary align-self-start" onClick={() => setAddingMember(true)}>{text.addMember}</button> : <div className="border rounded p-3 d-flex flex-column gap-2"><input className="form-control" placeholder={text.name} value={memberForm.personName} onChange={(e) => setMemberForm({ ...memberForm, personName: e.target.value })} /><select className="form-select" value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select><input type="date" className="form-control" value={memberForm.startsAt} onChange={(e) => setMemberForm({ ...memberForm, startsAt: e.target.value })} /><div className="d-flex gap-2"><button disabled={saving} className="btn btn-primary btn-sm" onClick={() => void addMember()}>{text.create}</button><button className="btn btn-outline-secondary btn-sm" onClick={() => setAddingMember(false)}>{text.close}</button></div></div>}
        <button disabled={saving} className="btn btn-primary align-self-start" onClick={() => void submit()}>{text.submit}</button>
      </>}
    </div></div>}
  </div>;
}
