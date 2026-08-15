"use client";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
const useLocale = useI18n;

type Sanction = { id: string; type: string; reason: string; status: string; enforceable: boolean; startsAt: string; endsAt?: string | null; amountDue?: string | null; currency?: string | null; liftReason?: string | null };
const TEXT = {
  fr: { title: "Sanctions fédérales", subtitle: "Sanctions et interdictions en vigueur ou passées contre le club.", type: "Type", status: "Statut", period: "Période", reason: "Motif", loading: "Chargement…", empty: "Aucune sanction.", enforceable: "En vigueur", notEnforceable: "Non opposable", liftReason: "Motif de la levée" },
  ar: { title: "العقوبات الفدرالية", subtitle: "العقوبات والمنع الساري أو السابق ضد النادي.", type: "النوع", status: "الحالة", period: "الفترة", reason: "السبب", loading: "جار التحميل…", empty: "لا توجد عقوبات.", enforceable: "سارية", notEnforceable: "غير سارية", liftReason: "سبب الرفع" },
} as const;

export default function ClubSanctionsManager() {
  const { locale } = useLocale(); const text = TEXT[locale as "fr" | "ar"] ?? TEXT.fr;
  const [sanctions, setSanctions] = useState<Sanction[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/admin/federation/sanctions", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Erreur"); setSanctions(data); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div>
    {error && <div className="alert alert-danger">{error}</div>}
    <div className="card border-0 shadow-sm"><div className="card-body p-0">
      {loading ? <p className="p-4">{text.loading}</p> : sanctions.length === 0 ? <p className="p-4 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.type}</th><th>{text.status}</th><th>{text.period}</th><th>{text.reason}</th></tr></thead><tbody>
        {sanctions.map((item) => <tr key={item.id}><td>{item.type}</td><td><span className={`badge ${item.enforceable ? "bg-danger" : "bg-secondary"}`}>{item.enforceable ? text.enforceable : text.notEnforceable}</span> <span className="text-muted small">{item.status}</span></td><td>{new Date(item.startsAt).toLocaleDateString()}{item.endsAt ? ` — ${new Date(item.endsAt).toLocaleDateString()}` : ""}</td><td>{item.reason}{item.liftReason ? <div className="text-muted small">{text.liftReason} : {item.liftReason}</div> : null}</td></tr>)}
      </tbody></table></div>}
    </div></div>
  </div>;
}
