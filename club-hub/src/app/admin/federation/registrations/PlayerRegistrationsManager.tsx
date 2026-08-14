"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

type RegistrationStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "SUSPENDED" | "CANCELLED";
type EligibilityStatus = "ELIGIBLE" | "INELIGIBLE" | "PENDING";
interface Registration { id: string; playerId: string; seasonId: string; licenseId: string; status: RegistrationStatus; eligibilityStatus: EligibilityStatus; registeredAt: string | null; rejectionReason: string | null; }
interface Candidate { id: string; name: string; category: string; }
interface License { id: string; playerId: string; seasonId: string; number: string | null; expiresAt: string | null; }
interface Season { id: string; nom: string; competitionType: string; }
interface HistoryRecord { id: string; action: string; actorRole: string; reason: string | null; createdAt: string; }
interface Bundle { registration: Registration; history: HistoryRecord[]; }

const TEXT = {
  fr: { title: "Inscriptions joueurs", subtitle: "Inscrivez les joueurs licenciés à une compétition-saison et suivez leur éligibilité.", new: "Nouvelle inscription", player: "Joueur", season: "Compétition · saison", license: "Licence active", status: "Statut", eligibility: "Éligibilité", open: "Ouvrir", create: "Créer", submit: "Soumettre", reopen: "Corriger le dossier", loading: "Chargement…", empty: "Aucune inscription.", history: "Historique", noHistory: "Aucun événement.", decision: "Décision réglementaire", close: "Fermer", selectPlayer: "Sélectionnez d’abord un joueur", noLicense: "Aucune licence PLAYER active ne correspond à ce joueur et à cette saison." },
  ar: { title: "تسجيلات اللاعبين", subtitle: "سجّل اللاعبين أصحاب التراخيص في مسابقة وموسم وتابع أهليتهم.", new: "تسجيل جديد", player: "اللاعب", season: "المسابقة · الموسم", license: "الترخيص الساري", status: "الحالة", eligibility: "الأهلية", open: "فتح", create: "إنشاء", submit: "إيداع", reopen: "تصحيح الملف", loading: "جار التحميل…", empty: "لا يوجد تسجيل.", history: "السجل", noHistory: "لا يوجد حدث.", decision: "القرار التنظيمي", close: "إغلاق", selectPlayer: "اختر اللاعب أولا", noLicense: "لا يوجد ترخيص PLAYER ساري لهذا اللاعب في هذا الموسم." },
};
const BADGES: Record<RegistrationStatus, string> = { DRAFT: "bg-secondary-subtle text-secondary", SUBMITTED: "bg-info-subtle text-info", APPROVED: "bg-success-subtle text-success", REJECTED: "bg-danger-subtle text-danger", SUSPENDED: "bg-warning-subtle text-warning", CANCELLED: "bg-dark-subtle text-dark" };
const ELIGIBILITY_BADGES: Record<EligibilityStatus, string> = { ELIGIBLE: "bg-success-subtle text-success", INELIGIBLE: "bg-danger-subtle text-danger", PENDING: "bg-warning-subtle text-warning" };

export default function PlayerRegistrationsManager() {
  const { locale } = useI18n();
  const text = TEXT[locale];
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [players, setPlayers] = useState<Candidate[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [selected, setSelected] = useState<Bundle | null>(null);
  const [form, setForm] = useState({ playerId: "", seasonId: "", licenseId: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/admin/federation/registrations", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erreur");
      setRegistrations(data.registrations); setPlayers(data.candidates.players); setLicenses(data.candidates.licenses); setSeasons(data.seasons); setCanManage(data.canManage);
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const playerNames = useMemo(() => new Map(players.map((player) => [player.id, player.name])), [players]);
  const seasonNames = useMemo(() => new Map(seasons.map((season) => [season.id, `${season.nom} · ${season.competitionType}`])), [seasons]);
  const matchingLicenses = useMemo(() => licenses.filter((license) => (!form.playerId || license.playerId === form.playerId) && (!form.seasonId || license.seasonId === form.seasonId)), [form.playerId, form.seasonId, licenses]);
  const availableSeasons = useMemo(() => seasons.filter((season) => !form.playerId || licenses.some((license) => license.playerId === form.playerId && license.seasonId === season.id)), [form.playerId, licenses, seasons]);

  async function open(id: string) {
    const response = await fetch(`/api/admin/federation/registrations/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "Erreur"); return; }
    setSelected(data);
  }
  async function create() {
    if (!form.playerId || !form.seasonId || !form.licenseId) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/admin/federation/registrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erreur");
      await load(); await open(data.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setSaving(false); }
  }
  async function action(name: "submit" | "reopen") {
    if (!selected) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/admin/federation/registrations/${selected.registration.id}/${name}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erreur");
      await Promise.all([load(), open(selected.registration.id)]);
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setSaving(false); }
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-4">
    <div><h1 className="h4 mb-1">{text.title}</h1><p className="text-muted mb-0">{text.subtitle}</p></div>
    {error && <div className="alert alert-danger mb-0">{error}</div>}
    {canManage && <div className="card border-0 shadow-sm"><div className="card-body"><h2 className="h6">{text.new}</h2><div className="row g-2">
      <div className="col-md-4"><label className="form-label">{text.player}</label><select className="form-select" value={form.playerId} onChange={(event) => setForm({ playerId: event.target.value, seasonId: "", licenseId: "" })}><option value="">—</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name} · {player.category}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label">{text.season}</label><select className="form-select" disabled={!form.playerId} value={form.seasonId} onChange={(event) => setForm({ ...form, seasonId: event.target.value, licenseId: "" })}><option value="">{form.playerId ? "—" : text.selectPlayer}</option>{availableSeasons.map((season) => <option key={season.id} value={season.id}>{season.nom} · {season.competitionType}</option>)}</select></div>
      <div className="col-md-3"><label className="form-label">{text.license}</label><select className="form-select" disabled={!form.seasonId} value={form.licenseId} onChange={(event) => setForm({ ...form, licenseId: event.target.value })}><option value="">—</option>{matchingLicenses.map((license) => <option key={license.id} value={license.id}>{license.number ?? license.id}{license.expiresAt ? ` · ${new Date(license.expiresAt).toLocaleDateString()}` : ""}</option>)}</select></div>
      <div className="col-md-1 d-flex align-items-end"><button disabled={saving || !form.licenseId} className="btn btn-primary w-100" onClick={() => void create()}>{text.create}</button></div>
    </div>{form.playerId && form.seasonId && matchingLicenses.length === 0 && <p className="small text-warning mt-2 mb-0">{text.noLicense}</p>}</div></div>}
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="p-4 mb-0">{text.loading}</p> : registrations.length === 0 ? <p className="p-4 mb-0 text-muted">{text.empty}</p> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{text.player}</th><th>{text.season}</th><th>{text.status}</th><th>{text.eligibility}</th><th /></tr></thead><tbody>{registrations.map((registration) => <tr key={registration.id}><td>{playerNames.get(registration.playerId) ?? registration.playerId}</td><td>{seasonNames.get(registration.seasonId) ?? registration.seasonId}</td><td><span className={`badge ${BADGES[registration.status]}`}>{registration.status}</span></td><td><span className={`badge ${ELIGIBILITY_BADGES[registration.eligibilityStatus]}`}>{registration.eligibilityStatus}</span></td><td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={() => void open(registration.id)}>{text.open}</button></td></tr>)}</tbody></table></div>}</div></div>
    {selected && <div className="card border-primary shadow-sm"><div className="card-header bg-transparent d-flex justify-content-between"><div><strong>{playerNames.get(selected.registration.playerId) ?? selected.registration.playerId}</strong> <span className={`badge ms-2 ${BADGES[selected.registration.status]}`}>{selected.registration.status}</span> <span className={`badge ms-1 ${ELIGIBILITY_BADGES[selected.registration.eligibilityStatus]}`}>{selected.registration.eligibilityStatus}</span></div><button className="btn-close" aria-label={text.close} onClick={() => setSelected(null)} /></div><div className="card-body d-flex flex-column gap-3">
      <div><strong>{text.season}:</strong> {seasonNames.get(selected.registration.seasonId) ?? selected.registration.seasonId}</div>
      {selected.registration.rejectionReason && <div className="alert alert-warning mb-0"><strong>{text.decision}:</strong> {selected.registration.rejectionReason}</div>}
      <div className="d-flex gap-2">{canManage && selected.registration.status === "DRAFT" && <button disabled={saving} className="btn btn-success" onClick={() => void action("submit")}>{text.submit}</button>}{canManage && selected.registration.status === "REJECTED" && <button disabled={saving} className="btn btn-warning" onClick={() => void action("reopen")}>{text.reopen}</button>}</div>
      <div><h2 className="h6">{text.history}</h2>{selected.history.length === 0 ? <p className="text-muted">{text.noHistory}</p> : <ul className="list-group list-group-flush">{selected.history.map((event) => <li key={event.id} className="list-group-item px-0"><strong>{event.action}</strong> · {event.actorRole}<div className="small text-muted">{new Date(event.createdAt).toLocaleString(locale === "ar" ? "ar-TN" : "fr-FR")}{event.reason ? ` · ${event.reason}` : ""}</div></li>)}</ul>}</div>
    </div></div>}
  </div>;
}
