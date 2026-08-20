"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { useConfirm } from "@/hooks/useConfirm";
import {
  activateSponsor,
  approveSponsorContract,
  deleteSponsorRequest,
  draftSponsorContract,
  refuseSponsorRequest,
  rejectSponsorContract,
  reviewSponsorRequest,
  startSponsorNegotiation,
  submitSponsorContractForApproval,
  updateSponsorContractDraft,
  updateSponsorshipGovernance,
} from "./actions";

type SponsorLevel = "OR" | "ARGENT" | "BRONZE" | "LOCAL";
type LogoSize = "SMALL" | "MEDIUM" | "LARGE";
type RequestStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "NEGOTIATION"
  | "CONTRACT_DRAFT"
  | "APPROVAL_PENDING"
  | "APPROVED"
  | "ACTIVE"
  | "EXPIRED"
  | "REFUSED";
type SponsorStatus = "CONTRACT_DRAFT" | "APPROVAL_PENDING" | "APPROVED" | "ACTIVE" | "EXPIRED";

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
  negotiationNotes: string | null;
  negotiationStartedAt: string | null;
  refusalReason: string | null;
  createdAt: string;
}

interface SponsorData {
  id: number;
  sponsorRequestId: number | null;
  companyName: string;
  logoUrl: string | null;
  logoSize: LogoSize;
  website: string | null;
  level: SponsorLevel;
  logoPlacement: string[];
  contractStart: string | null;
  contractEnd: string | null;
  contractAmount: number | null;
  workflowStatus: SponsorStatus;
  contractDraftedAt: string | null;
  activatedAt: string | null;
  expiredAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ApprovalData {
  id: string;
  sponsorId: number;
  makerUserId: string;
  approvalMode: "SINGLE_APPROVAL" | "DUAL_APPROVAL";
  requiredApprovals: number;
  approvalCount: number;
  contractAmount: number;
  thresholdSnapshot: number;
  createdAt: string;
}

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

const LEVEL_LABELS: Record<SponsorLevel, string> = {
  OR: "Or",
  ARGENT: "Argent",
  BRONZE: "Bronze",
  LOCAL: "Local",
};
const LOGO_SIZE_LABELS: Record<LogoSize, string> = { SMALL: "Petit", MEDIUM: "Moyen", LARGE: "Grand" };
const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Nouvelle",
  UNDER_REVIEW: "En revue",
  NEGOTIATION: "Négociation",
  CONTRACT_DRAFT: "Contrat en brouillon",
  APPROVAL_PENDING: "Approbation en cours",
  APPROVED: "Contrat approuvé",
  ACTIVE: "Actif",
  EXPIRED: "Expiré",
  REFUSED: "Refusé",
};
const SPONSOR_STATUS_LABELS: Record<SponsorStatus, string> = {
  CONTRACT_DRAFT: "Contrat en brouillon",
  APPROVAL_PENDING: "Approbation en cours",
  APPROVED: "Approuvé",
  ACTIVE: "Actif",
  EXPIRED: "Expiré",
};
const STATUS_BADGES: Record<RequestStatus | SponsorStatus, string> = {
  PENDING: "bg-primary-subtle text-primary",
  UNDER_REVIEW: "bg-info-subtle text-info",
  NEGOTIATION: "bg-warning-subtle text-warning",
  CONTRACT_DRAFT: "bg-secondary-subtle text-secondary",
  APPROVAL_PENDING: "bg-warning-subtle text-warning",
  APPROVED: "bg-success-subtle text-success",
  ACTIVE: "bg-success text-white",
  EXPIRED: "bg-dark-subtle text-dark",
  REFUSED: "bg-danger-subtle text-danger",
};
const PLACEMENTS = [
  ["HOME", "Accueil"],
  ["FOOTER", "Pied de page"],
  ["MATCH_PAGES", "Pages matchs"],
  ["SHOP", "Boutique"],
] as const;

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-TN");
}

function money(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);
}

function ContractFields({
  level,
  logoSize,
  placements,
  contractStart,
  contractEnd,
  contractAmount,
}: {
  level: SponsorLevel;
  logoSize: LogoSize;
  placements: string[];
  contractStart?: string | null;
  contractEnd?: string | null;
  contractAmount?: number | null;
}) {
  return (
    <div className="row g-3">
      <div className="col-md-4">
        <label className="form-label">Niveau</label>
        <select name="level" className="form-select" defaultValue={level} required>
          {Object.entries(LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label">Taille du logo</label>
        <select name="logoSize" className="form-select" defaultValue={logoSize} required>
          {Object.entries(LOGO_SIZE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label">Montant du contrat (DT)</label>
        <input
          name="contractAmount"
          type="number"
          min={0}
          max={999999999.999}
          step="0.001"
          className="form-control"
          defaultValue={contractAmount ?? ""}
          required
        />
      </div>
      <div className="col-md-6">
        <label className="form-label">Début du contrat</label>
        <input name="contractStart" type="date" className="form-control" defaultValue={contractStart ?? ""} required />
      </div>
      <div className="col-md-6">
        <label className="form-label">Fin du contrat</label>
        <input name="contractEnd" type="date" className="form-control" defaultValue={contractEnd ?? ""} required />
      </div>
      <div className="col-12">
        <span className="form-label d-block">Emplacements du logo</span>
        {PLACEMENTS.map(([value, label]) => (
          <div className="form-check form-check-inline" key={value}>
            <input
              className="form-check-input"
              type="checkbox"
              name="logoPlacement"
              value={value}
              id={`sponsor-placement-${value}`}
              defaultChecked={placements.includes(value)}
            />
            <label className="form-check-label" htmlFor={`sponsor-placement-${value}`}>{label}</label>
          </div>
        ))}
      </div>
      <div className="col-12">
        <label className="form-label">Notes internes</label>
        <textarea name="notes" className="form-control" rows={2} maxLength={2000} />
      </div>
    </div>
  );
}

export function SponsorsManagement({
  initialRequests,
  initialSponsors,
  pendingApprovals,
  governance,
  teamId,
  canManage,
}: {
  initialRequests: SponsorRequestData[];
  initialSponsors: SponsorData[];
  pendingApprovals: ApprovalData[];
  governance: { dualApprovalThreshold: number; version: number };
  teamId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"requests" | "contracts">("requests");
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);
  const [expandedSponsorId, setExpandedSponsorId] = useState<number | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requestSearch, setRequestSearch] = useState("");
  const [sponsorSearch, setSponsorSearch] = useState("");
  const { confirm, confirmDialog } = useConfirm();

  const approvalBySponsor = useMemo(
    () => new Map(pendingApprovals.map((approval) => [approval.sponsorId, approval])),
    [pendingApprovals],
  );
  const sponsorByRequest = useMemo(
    () => new Map(initialSponsors.filter((sponsor) => sponsor.sponsorRequestId !== null).map((sponsor) => [sponsor.sponsorRequestId!, sponsor])),
    [initialSponsors],
  );
  const visibleRequests = useMemo(() => {
    const query = requestSearch.trim().toLocaleLowerCase("fr");
    if (!query) return initialRequests;
    return initialRequests.filter((request) =>
      `${request.companyName} ${request.contactName} ${request.email}`.toLocaleLowerCase("fr").includes(query),
    );
  }, [initialRequests, requestSearch]);
  const visibleSponsors = useMemo(() => {
    const query = sponsorSearch.trim().toLocaleLowerCase("fr");
    if (!query) return initialSponsors;
    return initialSponsors.filter((sponsor) => sponsor.companyName.toLocaleLowerCase("fr").includes(query));
  }, [initialSponsors, sponsorSearch]);

  const publicUrl = typeof window === "undefined" ? `/devenir-sponsor/${teamId}` : `${window.location.origin}/devenir-sponsor/${teamId}`;

  async function run(key: string, action: () => Promise<ActionResult>) {
    setBusyKey(key);
    setError(null);
    setSuccess(null);
    try {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Action impossible");
        return;
      }
      setSuccess(result.message ?? "Action enregistrée");
      startTransition(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Une erreur est survenue");
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteRequest(id: number) {
    if (!(await confirm("Supprimer cette demande non traitée ?", { variant: "danger" }))) return;
    await run(`delete-request-${id}`, () => deleteSponsorRequest(id));
  }

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
        <div>
          <h1 className="h4 mb-1">Sponsors</h1>
          <p className="text-muted mb-0">Revue, négociation, contrat, approbation, activation et expiration.</p>
        </div>
        <div className="text-end small text-muted">
          <div>Formulaire public</div>
          <code>{publicUrl}</code>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card mb-4">
        <div className="card-body d-flex justify-content-between align-items-end gap-3 flex-wrap">
          <div>
            <div className="fw-semibold">Gouvernance financière</div>
            <div className="text-muted small">
              Contrats ≥ {money(governance.dualApprovalThreshold)} DT : double approbation. Version {governance.version}.
            </div>
            {governance.version === 0 && (
              <div className="text-warning small mt-1">Seuil non configuré : mode fail-safe, tous les contrats exigent deux approbations.</div>
            )}
          </div>
          {canManage && (
            <form
              className="d-flex align-items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void run("governance", () => updateSponsorshipGovernance(formData));
              }}
            >
              <div>
                <label className="form-label small">Seuil double approbation (DT)</label>
                <input
                  className="form-control form-control-sm"
                  type="number"
                  name="dualApprovalThreshold"
                  min={0}
                  max={999999999.999}
                  step="0.001"
                  defaultValue={governance.dualApprovalThreshold}
                  required
                />
              </div>
              <button className="btn btn-outline-primary btn-sm" disabled={busyKey === "governance" || isPending}>Enregistrer</button>
            </form>
          )}
        </div>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === "requests" ? "active" : ""}`} onClick={() => setTab("requests")}>
            Demandes <span className="badge bg-secondary ms-1">{initialRequests.length}</span>
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === "contracts" ? "active" : ""}`} onClick={() => setTab("contracts")}>
            Contrats / sponsors <span className="badge bg-secondary ms-1">{initialSponsors.length}</span>
          </button>
        </li>
      </ul>

      {tab === "requests" && (
        <div>
          <input
            className="form-control mb-3"
            type="search"
            placeholder="Rechercher entreprise, contact ou email"
            value={requestSearch}
            onChange={(event) => setRequestSearch(event.target.value)}
          />
          <div className="d-grid gap-3">
            {visibleRequests.length === 0 && <div className="card card-body text-center text-muted">Aucune demande.</div>}
            {visibleRequests.map((request) => {
              const sponsor = sponsorByRequest.get(request.id);
              const expanded = expandedRequestId === request.id;
              return (
                <div className="card" key={request.id}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                      <div className="d-flex gap-3 align-items-center">
                        {request.logoUrl ? (
                          <ImageWithFallback
                            src={request.logoUrl}
                            alt={request.companyName}
                            className="avatar-sm rounded border"
                            style={{ objectFit: "contain" }}
                            fallbackIcon="fas fa-handshake"
                          />
                        ) : (
                          <div className="avatar-sm"><span className="avatar-title rounded bg-light text-muted">{request.companyName.slice(0, 1)}</span></div>
                        )}
                        <div>
                          <div className="fw-semibold">{request.companyName}</div>
                          <div className="small text-muted">{request.contactName} — {request.email}{request.phone ? ` — ${request.phone}` : ""}</div>
                          <div className="small text-muted">Reçue le {formatDate(request.createdAt)}</div>
                        </div>
                      </div>
                      <span className={`badge ${STATUS_BADGES[request.status]}`}>{REQUEST_STATUS_LABELS[request.status]}</span>
                    </div>

                    {request.message && <p className="mt-3 mb-1">{request.message}</p>}
                    {request.adminNotes && <div className="small text-muted mt-2"><strong>Revue :</strong> {request.adminNotes}</div>}
                    {request.negotiationNotes && <div className="small text-muted"><strong>Négociation :</strong> {request.negotiationNotes}</div>}
                    {request.refusalReason && <div className="alert alert-danger py-2 mt-3 mb-0">{request.refusalReason}</div>}

                    <div className="d-flex gap-2 mt-3 flex-wrap">
                      {(canManage && ["PENDING", "UNDER_REVIEW", "NEGOTIATION"].includes(request.status)) && (
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => setExpandedRequestId(expanded ? null : request.id)}>
                          {expanded ? "Fermer" : "Traiter"}
                        </button>
                      )}
                      {canManage && request.status === "PENDING" && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={busyKey === `delete-request-${request.id}`}
                          onClick={() => void deleteRequest(request.id)}
                        >
                          Supprimer
                        </button>
                      )}
                      {sponsor && (
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setTab("contracts"); setExpandedSponsorId(sponsor.id); }}>
                          Ouvrir le contrat
                        </button>
                      )}
                    </div>

                    {expanded && canManage && (
                      <div className="border rounded p-3 mt-3 bg-light-subtle">
                        {request.status === "PENDING" && (
                          <form onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); void run(`review-${request.id}`, () => reviewSponsorRequest(request.id, formData)); }}>
                            <label className="form-label">Note de revue</label>
                            <textarea name="notes" className="form-control mb-2" rows={2} maxLength={2000} />
                            <button className="btn btn-primary btn-sm" disabled={busyKey === `review-${request.id}`}>Valider la revue</button>
                          </form>
                        )}

                        {request.status === "UNDER_REVIEW" && (
                          <form onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); void run(`negotiation-${request.id}`, () => startSponsorNegotiation(request.id, formData)); }}>
                            <label className="form-label">Cadrage de la négociation</label>
                            <textarea name="notes" className="form-control mb-2" rows={2} maxLength={2000} />
                            <button className="btn btn-warning btn-sm" disabled={busyKey === `negotiation-${request.id}`}>Démarrer la négociation</button>
                          </form>
                        )}

                        {request.status === "NEGOTIATION" && (
                          <form onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); void run(`draft-${request.id}`, () => draftSponsorContract(request.id, formData)); }}>
                            <ContractFields
                              level={request.proposedLevel ?? "LOCAL"}
                              logoSize={request.logoSize ?? "MEDIUM"}
                              placements={[]}
                            />
                            <button className="btn btn-primary btn-sm mt-3" disabled={busyKey === `draft-${request.id}`}>Créer le brouillon de contrat</button>
                          </form>
                        )}

                        {["PENDING", "UNDER_REVIEW", "NEGOTIATION"].includes(request.status) && (
                          <form
                            className="mt-3 pt-3 border-top"
                            onSubmit={(event) => {
                              event.preventDefault();
                              const formData = new FormData(event.currentTarget);
                              void run(`refuse-${request.id}`, () => refuseSponsorRequest(request.id, formData));
                            }}
                          >
                            <label className="form-label">Motif de refus</label>
                            <div className="d-flex gap-2">
                              <input name="reason" className="form-control" minLength={3} maxLength={2000} required />
                              <button className="btn btn-outline-danger btn-sm" disabled={busyKey === `refuse-${request.id}`}>Refuser</button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "contracts" && (
        <div>
          <input
            className="form-control mb-3"
            type="search"
            placeholder="Rechercher un sponsor"
            value={sponsorSearch}
            onChange={(event) => setSponsorSearch(event.target.value)}
          />
          <div className="d-grid gap-3">
            {visibleSponsors.length === 0 && <div className="card card-body text-center text-muted">Aucun contrat sponsor.</div>}
            {visibleSponsors.map((sponsor) => {
              const approval = approvalBySponsor.get(sponsor.id);
              const expanded = expandedSponsorId === sponsor.id;
              return (
                <div className="card" key={sponsor.id}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                      <div>
                        <div className="fw-semibold">{sponsor.companyName}</div>
                        <div className="small text-muted">
                          {LEVEL_LABELS[sponsor.level]} — {money(sponsor.contractAmount)} DT — {sponsor.contractStart ?? "—"} → {sponsor.contractEnd ?? "—"}
                        </div>
                      </div>
                      <span className={`badge ${STATUS_BADGES[sponsor.workflowStatus]}`}>{SPONSOR_STATUS_LABELS[sponsor.workflowStatus]}</span>
                    </div>

                    {approval && (
                      <div className="alert alert-warning py-2 mt-3 mb-0">
                        Approbations : <strong>{approval.approvalCount}/{approval.requiredApprovals}</strong> — {approval.approvalMode === "DUAL_APPROVAL" ? "double validation" : "validation simple"} — seuil figé {money(approval.thresholdSnapshot)} DT.
                      </div>
                    )}
                    {sponsor.workflowStatus === "ACTIVE" && (
                      <div className="alert alert-success py-2 mt-3 mb-0">Actif depuis {formatDate(sponsor.activatedAt)}. Expiration contractuelle : {sponsor.contractEnd ?? "—"}.</div>
                    )}
                    {sponsor.workflowStatus === "EXPIRED" && (
                      <div className="alert alert-secondary py-2 mt-3 mb-0">Expiré le {formatDate(sponsor.expiredAt)}.</div>
                    )}

                    <div className="d-flex gap-2 mt-3 flex-wrap">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setExpandedSponsorId(expanded ? null : sponsor.id)}>
                        {expanded ? "Fermer" : "Détails / actions"}
                      </button>
                      {canManage && sponsor.workflowStatus === "CONTRACT_DRAFT" && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={busyKey === `submit-${sponsor.id}`}
                          onClick={() => void run(`submit-${sponsor.id}`, () => submitSponsorContractForApproval(sponsor.id))}
                        >
                          Soumettre à approbation
                        </button>
                      )}
                      {canManage && sponsor.workflowStatus === "APPROVED" && (
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          disabled={busyKey === `activate-${sponsor.id}`}
                          onClick={() => void run(`activate-${sponsor.id}`, () => activateSponsor(sponsor.id))}
                        >
                          Activer
                        </button>
                      )}
                    </div>

                    {expanded && (
                      <div className="border rounded p-3 mt-3 bg-light-subtle">
                        <dl className="row small mb-3">
                          <dt className="col-sm-3">Taille logo</dt><dd className="col-sm-9">{LOGO_SIZE_LABELS[sponsor.logoSize]}</dd>
                          <dt className="col-sm-3">Emplacements</dt><dd className="col-sm-9">{sponsor.logoPlacement.join(", ") || "—"}</dd>
                          <dt className="col-sm-3">Brouillon</dt><dd className="col-sm-9">{formatDate(sponsor.contractDraftedAt)}</dd>
                          <dt className="col-sm-3">Actif en base</dt><dd className="col-sm-9">{sponsor.isActive ? "Oui" : "Non"}</dd>
                        </dl>

                        {canManage && sponsor.workflowStatus === "CONTRACT_DRAFT" && (
                          <form onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); void run(`edit-${sponsor.id}`, () => updateSponsorContractDraft(sponsor.id, formData)); }}>
                            <ContractFields
                              level={sponsor.level}
                              logoSize={sponsor.logoSize}
                              placements={sponsor.logoPlacement}
                              contractStart={sponsor.contractStart}
                              contractEnd={sponsor.contractEnd}
                              contractAmount={sponsor.contractAmount}
                            />
                            <button className="btn btn-outline-primary btn-sm mt-3" disabled={busyKey === `edit-${sponsor.id}`}>Enregistrer le brouillon</button>
                          </form>
                        )}

                        {canManage && sponsor.workflowStatus === "APPROVAL_PENDING" && approval && (
                          <div className="row g-3">
                            <div className="col-md-6">
                              <button
                                type="button"
                                className="btn btn-success btn-sm"
                                disabled={busyKey === `approve-${approval.id}`}
                                onClick={() => void run(`approve-${approval.id}`, () => approveSponsorContract(approval.id))}
                              >
                                Approuver le contrat
                              </button>
                            </div>
                            <div className="col-md-6">
                              <form onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); void run(`reject-${approval.id}`, () => rejectSponsorContract(approval.id, formData)); }}>
                                <div className="input-group input-group-sm">
                                  <input name="reason" className="form-control" minLength={3} maxLength={2000} placeholder="Motif du rejet" required />
                                  <button className="btn btn-outline-danger" disabled={busyKey === `reject-${approval.id}`}>Rejeter</button>
                                </div>
                              </form>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
