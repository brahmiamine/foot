"use client";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
const useLocale = useI18n;

type LegalCase = { id: string; caseNumber: string; category: string; status: string; subject: string; partyRole: string; filedAt: string; hearingDate?: string | null; decisionSummary?: string | null };
type Doc = { id: string; fileUrl: string; fileName: string; version: number; submittedByType: string };
type Hearing = { id: string; scheduledAt: string; location?: string | null; mode: string; held: boolean };
type Decision = { id: string; summary: string; amountAwarded?: string | null; currency?: string | null; decidedAt: string };
type EventItem = { id: string; action: string; actorRole: string; reason?: string | null; createdAt: string };
type Bundle = { legalCase: LegalCase; documents: Doc[]; hearings: Hearing[]; decisions: Decision[]; events: EventItem[] };
const TEXT = {
  fr: { title: "Litiges", subtitle: "Dossiers où le club est partie (demandeur ou défendeur).", case: "Dossier", role: "Rôle", claimant: "Demandeur", respondent: "Défendeur", status: "Statut", open: "Ouvrir", loading: "Chargement…", empty: "Aucun litige.", subject: "Objet", documents: "Pièces", hearings: "Audiences", decisions: "Décisions", history: "Historique", close: "Fermer", addDocument: "Déposer une pièce", fileUrl: "URL du fichier", fileName: "Nom du fichier", note: "Note (optionnel)", save: "Envoyer", cancel: "Annuler" },
  ar: { title: "النزاعات", subtitle: "الملفات التي يكون النادي طرفا فيها.", case: "الملف", role: "الصفة", claimant: "المدعي", respondent: "المدعى عليه", status: "الحالة", open: "فتح", loading: "جار التحميل…", empty: "لا توجد نزاعات.", subject: "الموضوع", documents: "الوثائق", hearings: "الجلسات", decisions: "القرارات", history: "السجل", close: "إغلاق", addDocument: "إيداع وثيقة", fileUrl: "رابط الملف", fileName: "اسم الملف", note: "ملاحظة (اختياري)", save: "إرسال", cancel: "إلغاء" },
} as const;

export default function LegalCasesManager() {
  const { locale } = useLocale(); const text = TEXT[locale as "fr" | "ar"] ?? TEXT.fr;
  const [cases, setCases] = useState<LegalCase[]>([]); const [selected, setSelected] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false); const [form, setForm] = useState({ fileUrl: "", fileName: "", note: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/admin/federation/legal-cases", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); setCases(data); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function open(id: string) { const response = await fetch(`/api/admin/federation/legal-cases/${id}`, { cache: "no-store" }); const data = await response.json(); if (!response.ok) return setError(data.error ?? "Erreur"); setSelected(data); }
  async function submitDocument() {
    if (!selected || !form.fileUrl.trim() || !form.fileName.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/federation/legal-cases/${selected.legalCase.id}/documents`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileUrl: form.fileUrl, fileName: form.fileName, mimeType: "application/pdf", checksum: "0".repeat(64), size: 0, note: form.note || null }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur");
      setAdding(false); setForm({ fileUrl: "", fileName: "", note: "" }); await open(selected.legalCase.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur"); } finally { setSaving(false); }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div>
    {error && <div className="alert alert-danger">{error}</div>}
    <div className="card border-0 shadow-sm"><div className="card-body p-0">
      {loading ? <p className="p-4">{text.loading}</p> : cases.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.case}</th><th>{text.role}</th><th>{text.status}</th><th /></tr></thead><tbody>
        {cases.map((item) => <tr key={item.id}><td>{item.caseNumber}</td><td>{item.partyRole === "CLAIMANT" ? text.claimant : text.respondent}</td><td><span className="badge bg-secondary">{item.status}</span></td><td><button className="btn btn-sm btn-outline-primary" onClick={() => void open(item.id)}>{text.open}</button></td></tr>)}
      </tbody></table></div>}
    </div></div>
    {selected && <div className="card border-primary"><div className="card-header d-flex justify-content-between"><strong>{selected.legalCase.caseNumber}</strong><button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      <div><strong>{text.subject}:</strong> {selected.legalCase.subject}</div>
      {selected.legalCase.decisionSummary && <div className="alert alert-info">{selected.legalCase.decisionSummary}</div>}
      <div><h2 className="h6">{text.documents}</h2>{selected.documents.map((item) => <div key={item.id}><a href={item.fileUrl} target="_blank" rel="noreferrer">{item.fileName} · v{item.version}</a></div>)}
        {!adding ? <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => setAdding(true)}>{text.addDocument}</button> : <div className="border rounded p-3 mt-2 d-flex flex-column gap-2"><input className="form-control" placeholder={text.fileUrl} value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} /><input className="form-control" placeholder={text.fileName} value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} /><textarea className="form-control" placeholder={text.note} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /><div className="d-flex gap-2"><button disabled={saving} className="btn btn-primary btn-sm" onClick={() => void submitDocument()}>{text.save}</button><button className="btn btn-outline-secondary btn-sm" onClick={() => setAdding(false)}>{text.cancel}</button></div></div>}
      </div>
      <div><h2 className="h6">{text.hearings}</h2>{selected.hearings.map((item) => <div key={item.id} className="border-top py-2">{new Date(item.scheduledAt).toLocaleString()}{item.location ? ` · ${item.location}` : ""}</div>)}</div>
      <div><h2 className="h6">{text.decisions}</h2>{selected.decisions.map((item) => <div key={item.id} className="border-top py-2">{item.summary}</div>)}</div>
      <div><h2 className="h6">{text.history}</h2>{selected.events.map((item) => <div key={item.id} className="border-top py-2"><strong>{item.action}</strong>{item.reason ? ` · ${item.reason}` : ""}</div>)}</div>
    </div></div>}
  </div>;
}
