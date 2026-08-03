"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  acceptSponsorRequest,
  refuseSponsorRequest,
  deleteSponsorRequest,
  updateSponsor,
  deleteSponsor,
} from "./actions";

type SponsorLevel = "OR" | "ARGENT" | "BRONZE" | "LOCAL";
type LogoSize = "SMALL" | "MEDIUM" | "LARGE";
type RequestStatus = "PENDING" | "ACCEPTED" | "REFUSED";

interface SponsorRequestData {
  id: number;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  logoSize: LogoSize | null;
  proposedLevel: SponsorLevel | null;
  message: string | null;
  status: RequestStatus;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface SponsorData {
  id: number;
  companyName: string;
  logoUrl: string | null;
  logoSize: LogoSize;
  website: string | null;
  level: SponsorLevel;
  logoPlacement: string[];
  contractStart: string | null;
  contractEnd: string | null;
  contractAmount: number | null;
  isActive: boolean;
  createdAt: string;
}

const LEVEL_LABELS: Record<SponsorLevel, string> = { OR: "Or", ARGENT: "Argent", BRONZE: "Bronze", LOCAL: "Local" };
const LEVEL_BADGES: Record<SponsorLevel, string> = {
  OR: "bg-warning-subtle text-warning",
  ARGENT: "bg-secondary-subtle text-secondary",
  BRONZE: "bg-danger-subtle text-danger",
  LOCAL: "bg-info-subtle text-info",
};
const LOGO_SIZE_LABELS: Record<LogoSize, string> = { SMALL: "Petit", MEDIUM: "Moyen", LARGE: "Grand" };
const STATUS_LABELS: Record<RequestStatus, string> = { PENDING: "En attente", ACCEPTED: "Acceptée", REFUSED: "Refusée" };
const STATUS_BADGES: Record<RequestStatus, string> = {
  PENDING: "bg-warning-subtle text-warning",
  ACCEPTED: "bg-success-subtle text-success",
  REFUSED: "bg-danger-subtle text-danger",
};
const PLACEMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "HOME", label: "Page d'accueil" },
  { value: "FOOTER", label: "Pied de page" },
  { value: "MATCH_PAGES", label: "Pages matchs" },
  { value: "SHOP", label: "Boutique" },
];

export function SponsorsManagement({
  initialRequests,
  initialSponsors,
  teamId,
}: {
  initialRequests: SponsorRequestData[];
  initialSponsors: SponsorData[];
  teamId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const requests = initialRequests;
  const sponsors = initialSponsors;

  const [tab, setTab] = useState<"requests" | "sponsors">("requests");
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);
  const [editingSponsorId, setEditingSponsorId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const acceptFormRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/devenir-sponsor/${teamId}` : `/devenir-sponsor/${teamId}`;

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Ignore clipboard failures (unsupported browser/context)
    }
  };

  const handleAccept = async (id: number) => {
    if (!acceptFormRef.current) return;
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData(acceptFormRef.current);
      const result = await acceptSponsorRequest(id, formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        setExpandedRequestId(null);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de l'acceptation");
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleRefuse = async (id: number) => {
    if (!acceptFormRef.current) return;
    const adminNotes = (acceptFormRef.current.elements.namedItem("adminNotes") as HTMLTextAreaElement | null)?.value ?? "";
    if (!adminNotes.trim()) {
      setError("Merci de préciser le motif du refus dans les notes avant de refuser.");
      return;
    }
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.set("adminNotes", adminNotes);
      const result = await refuseSponsorRequest(id, formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        setExpandedRequestId(null);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors du refus");
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteRequest = async (id: number) => {
    if (!confirm("Supprimer cette demande ?")) return;
    setBusyId(id);
    try {
      const result = await deleteSponsorRequest(id);
      if (result.success) startTransition(() => router.refresh());
      else setError(result.error || "Erreur lors de la suppression");
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateSponsor = async (e: React.FormEvent<HTMLFormElement>, id: number) => {
    e.preventDefault();
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await updateSponsor(id, formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        setEditingSponsorId(null);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de la modification");
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteSponsor = async (id: number) => {
    if (!confirm("Supprimer ce dossier sponsor ?")) return;
    setBusyId(id);
    try {
      const result = await deleteSponsor(id);
      if (result.success) startTransition(() => router.refresh());
      else setError(result.error || "Erreur lors de la suppression");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Sponsors</h1>
          <p className="text-muted mb-0">Demandes de partenariat et dossiers sponsors actifs.</p>
        </div>
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleCopyLink}>
          <i className={`fas ${linkCopied ? "fa-check" : "fa-link"} me-2`} aria-hidden="true" />
          {linkCopied ? "Lien copié !" : "Copier le lien du formulaire public"}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}
      {success && (
        <div className="alert alert-success d-flex justify-content-between align-items-start mb-4">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === "requests" ? "active" : ""}`} onClick={() => setTab("requests")}>
            Demandes {pendingCount > 0 && <span className="badge bg-warning-subtle text-warning ms-1">{pendingCount}</span>}
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === "sponsors" ? "active" : ""}`} onClick={() => setTab("sponsors")}>
            Sponsors actifs <span className="badge bg-primary-subtle text-primary ms-1">{sponsors.length}</span>
          </button>
        </li>
      </ul>

      {tab === "requests" && (
        <div className="d-grid gap-3">
          {requests.length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-5">
                <p className="text-muted mb-0">Aucune demande de partenariat reçue pour le moment</p>
              </div>
            </div>
          ) : (
            requests.map((r) => (
              <div className="card" key={r.id}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                    <div className="d-flex align-items-center gap-3">
                      {r.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.logoUrl} alt={r.companyName} className="avatar-sm rounded border" style={{ objectFit: "contain" }} />
                      ) : (
                        <div className="avatar-sm">
                          <span className="avatar-title rounded bg-light text-muted">{r.companyName.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div>
                        <h6 className="mb-0">{r.companyName}</h6>
                        <div className="text-muted small">
                          {r.contactName} — {r.email}
                          {r.phone && <> — {r.phone}</>}
                        </div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge ${STATUS_BADGES[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                      {r.proposedLevel && <span className={`badge ${LEVEL_BADGES[r.proposedLevel]}`}>Souhaité : {LEVEL_LABELS[r.proposedLevel]}</span>}
                      {r.logoSize && <span className="badge bg-light text-dark border">Logo {LOGO_SIZE_LABELS[r.logoSize]}</span>}
                    </div>
                  </div>

                  {r.website && (
                    <div className="small mb-1">
                      <a href={r.website} target="_blank" rel="noreferrer">
                        {r.website}
                      </a>
                    </div>
                  )}
                  {r.message && <p className="mb-2">{r.message}</p>}
                  {r.adminNotes && (
                    <div className="alert alert-light border small mb-2">
                      <strong>Note admin :</strong> {r.adminNotes}
                    </div>
                  )}
                  <div className="text-muted small mb-2">Reçue le {new Date(r.createdAt).toLocaleDateString("fr-TN")}</div>

                  <div className="d-flex gap-2">
                    {r.status === "PENDING" && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => setExpandedRequestId(expandedRequestId === r.id ? null : r.id)}
                      >
                        {expandedRequestId === r.id ? "Fermer" : "Traiter la demande"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDeleteRequest(r.id)}
                      disabled={busyId === r.id}
                    >
                      Supprimer
                    </button>
                  </div>

                  {expandedRequestId === r.id && (
                    <div className="border rounded p-3 mt-3 bg-light-subtle">
                      <form ref={acceptFormRef} className="row g-3" onSubmit={(e) => e.preventDefault()}>
                        <div className="col-md-4">
                          <label className="form-label">Niveau de sponsoring</label>
                          <select name="level" className="form-select" defaultValue={r.proposedLevel ?? "LOCAL"}>
                            <option value="OR">Or — Sponsor principal</option>
                            <option value="ARGENT">Argent — Sponsor officiel</option>
                            <option value="BRONZE">Bronze — Partenaire</option>
                            <option value="LOCAL">Local — Petit commerce</option>
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Taille du logo</label>
                          <select name="logoSize" className="form-select" defaultValue={r.logoSize ?? "MEDIUM"}>
                            <option value="SMALL">Petit</option>
                            <option value="MEDIUM">Moyen</option>
                            <option value="LARGE">Grand</option>
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Montant du contrat (DT)</label>
                          <input name="contractAmount" type="number" min={0} step="0.001" className="form-control" />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Début du contrat</label>
                          <input name="contractStart" type="date" className="form-control" />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Fin du contrat</label>
                          <input name="contractEnd" type="date" className="form-control" />
                        </div>
                        <div className="col-12">
                          <label className="form-label d-block">Emplacement du logo</label>
                          {PLACEMENT_OPTIONS.map((opt) => (
                            <div className="form-check form-check-inline" key={opt.value}>
                              <input className="form-check-input" type="checkbox" name="logoPlacement" value={opt.value} id={`placement-${r.id}-${opt.value}`} />
                              <label className="form-check-label" htmlFor={`placement-${r.id}-${opt.value}`}>
                                {opt.label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <div className="col-12">
                          <label className="form-label">Notes admin (motif de refus si applicable)</label>
                          <textarea name="adminNotes" className="form-control" rows={2} />
                        </div>
                        <div className="col-12 d-flex gap-2">
                          <button type="button" className="btn btn-success" disabled={busyId === r.id} onClick={() => handleAccept(r.id)}>
                            {busyId === r.id ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : "Accepter le partenariat"}
                          </button>
                          <button type="button" className="btn btn-outline-danger" disabled={busyId === r.id} onClick={() => handleRefuse(r.id)}>
                            Refuser
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "sponsors" && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0">Dossiers sponsors actifs</h5>
          </div>
          <div className="card-body">
            {sponsors.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted mb-0">Aucun sponsor actif — acceptez une demande pour en créer un</p>
              </div>
            ) : (
              <div className="d-grid gap-3">
                {sponsors.map((s) => (
                  <div className="border rounded p-3" key={s.id}>
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-3">
                        {s.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.logoUrl} alt={s.companyName} className="avatar-sm rounded border" style={{ objectFit: "contain" }} />
                        ) : (
                          <div className="avatar-sm">
                            <span className="avatar-title rounded bg-light text-muted">{s.companyName.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div>
                          <h6 className="mb-0">{s.companyName}</h6>
                          <div className="d-flex gap-1 flex-wrap mt-1">
                            <span className={`badge ${LEVEL_BADGES[s.level]}`}>{LEVEL_LABELS[s.level]}</span>
                            <span className="badge bg-light text-dark border">Logo {LOGO_SIZE_LABELS[s.logoSize]}</span>
                            {!s.isActive && <span className="badge bg-secondary-subtle text-secondary">Inactif</span>}
                            {s.logoPlacement.map((p) => (
                              <span className="badge bg-info-subtle text-info" key={p}>
                                {PLACEMENT_OPTIONS.find((o) => o.value === p)?.label ?? p}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setEditingSponsorId(editingSponsorId === s.id ? null : s.id)}
                        >
                          {editingSponsorId === s.id ? "Fermer" : "Modifier"}
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteSponsor(s.id)} disabled={busyId === s.id}>
                          Supprimer
                        </button>
                      </div>
                    </div>

                    <div className="text-muted small mt-2">
                      {s.contractStart && <>Du {new Date(s.contractStart).toLocaleDateString("fr-TN")} </>}
                      {s.contractEnd && <>au {new Date(s.contractEnd).toLocaleDateString("fr-TN")} </>}
                      {s.contractAmount !== null && <>— {s.contractAmount.toFixed(3)} DT</>}
                    </div>

                    {editingSponsorId === s.id && (
                      <form ref={editFormRef} className="row g-3 border rounded p-3 mt-3 bg-light-subtle" onSubmit={(e) => handleUpdateSponsor(e, s.id)}>
                        <div className="col-md-4">
                          <label className="form-label">Nom de l&apos;entreprise</label>
                          <input name="companyName" type="text" className="form-control" defaultValue={s.companyName} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Niveau</label>
                          <select name="level" className="form-select" defaultValue={s.level}>
                            <option value="OR">Or</option>
                            <option value="ARGENT">Argent</option>
                            <option value="BRONZE">Bronze</option>
                            <option value="LOCAL">Local</option>
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Taille du logo</label>
                          <select name="logoSize" className="form-select" defaultValue={s.logoSize}>
                            <option value="SMALL">Petit</option>
                            <option value="MEDIUM">Moyen</option>
                            <option value="LARGE">Grand</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Site web</label>
                          <input name="website" type="text" className="form-control" defaultValue={s.website ?? ""} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Montant du contrat (DT)</label>
                          <input name="contractAmount" type="number" min={0} step="0.001" className="form-control" defaultValue={s.contractAmount ?? ""} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Début du contrat</label>
                          <input name="contractStart" type="date" className="form-control" defaultValue={s.contractStart ?? ""} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Fin du contrat</label>
                          <input name="contractEnd" type="date" className="form-control" defaultValue={s.contractEnd ?? ""} />
                        </div>
                        <div className="col-12">
                          <label className="form-label d-block">Emplacement du logo</label>
                          {PLACEMENT_OPTIONS.map((opt) => (
                            <div className="form-check form-check-inline" key={opt.value}>
                              <input
                                className="form-check-input"
                                type="checkbox"
                                name="logoPlacement"
                                value={opt.value}
                                id={`edit-placement-${s.id}-${opt.value}`}
                                defaultChecked={s.logoPlacement.includes(opt.value)}
                              />
                              <label className="form-check-label" htmlFor={`edit-placement-${s.id}-${opt.value}`}>
                                {opt.label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <div className="col-12">
                          <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" role="switch" name="isActive" id={`active-${s.id}`} defaultChecked={s.isActive} />
                            <label className="form-check-label" htmlFor={`active-${s.id}`}>
                              Dossier actif
                            </label>
                          </div>
                        </div>
                        <div className="col-12">
                          <button type="submit" className="btn btn-primary" disabled={busyId === s.id || isPending}>
                            {busyId === s.id ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : "Enregistrer"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
