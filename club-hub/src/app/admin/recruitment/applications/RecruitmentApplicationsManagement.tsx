"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import {
  acceptRecruitmentApplication,
  approveRecruitmentCoach,
  approveRecruitmentScout,
  approveRecruitmentSportingDirector,
  approveRecruitmentTrial,
  deleteRecruitmentApplication,
  rejectRecruitmentApplication,
  scheduleRecruitmentTrial,
  startRecruitmentNegotiation,
} from "../actions";

type RecruitmentStatus =
  | "NEW"
  | "SCOUT_APPROVED"
  | "COACH_APPROVED"
  | "TRIAL_SCHEDULED"
  | "TRIAL_APPROVED"
  | "SPORTING_DIRECTOR_APPROVED"
  | "NEGOTIATION"
  | "ACCEPTED"
  | "REJECTED";

interface ApplicationData {
  id: number;
  name: string;
  birthDate: string;
  category: string;
  position: string;
  currentClub: string | null;
  parentPhone: string;
  email: string | null;
  videoUrl: string | null;
  message: string | null;
  status: RecruitmentStatus;
  adminNotes: string | null;
  scoutReviewedAt: string | null;
  scoutNotes: string | null;
  coachReviewedAt: string | null;
  coachNotes: string | null;
  trialScheduledAt: string | null;
  trialLocation: string | null;
  trialNotes: string | null;
  trialApprovedAt: string | null;
  trialEvaluation: string | null;
  sportingDirectorApprovedAt: string | null;
  sportingDirectorNotes: string | null;
  negotiationStartedAt: string | null;
  negotiationNotes: string | null;
  acceptedAt: string | null;
  acceptanceNotes: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

const STATUS_LABELS: Record<RecruitmentStatus, string> = {
  NEW: "Nouvelle",
  SCOUT_APPROVED: "Validée scout",
  COACH_APPROVED: "Validée coach",
  TRIAL_SCHEDULED: "Essai planifié",
  TRIAL_APPROVED: "Essai validé",
  SPORTING_DIRECTOR_APPROVED: "Validée directeur sportif",
  NEGOTIATION: "Négociation",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
};

const STATUS_BADGE: Record<RecruitmentStatus, string> = {
  NEW: "bg-primary",
  SCOUT_APPROVED: "bg-info text-dark",
  COACH_APPROVED: "bg-info text-dark",
  TRIAL_SCHEDULED: "bg-warning text-dark",
  TRIAL_APPROVED: "bg-success-subtle text-success",
  SPORTING_DIRECTOR_APPROVED: "bg-success-subtle text-success",
  NEGOTIATION: "bg-warning text-dark",
  ACCEPTED: "bg-success",
  REJECTED: "bg-danger",
};

const REJECTABLE = new Set<RecruitmentStatus>([
  "NEW",
  "SCOUT_APPROVED",
  "COACH_APPROVED",
  "TRIAL_SCHEDULED",
  "TRIAL_APPROVED",
  "SPORTING_DIRECTOR_APPROVED",
  "NEGOTIATION",
]);

function formatInstant(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function RecruitmentApplicationsManagement({
  initialApplications,
  canManage,
}: {
  initialApplications: ApplicationData[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const applications = initialApplications.filter(
    (application) => statusFilter === "ALL" || application.status === statusFilter,
  );

  async function runAction(
    id: number,
    action: (id: number, formData: FormData) => Promise<ActionResult>,
    formData: FormData,
  ) {
    setLoadingId(id);
    setError(null);
    setSuccess(null);
    try {
      const result = await action(id, formData);
      if (!result.success) {
        setError(result.error || "Erreur lors du traitement de la candidature");
        return;
      }
      setSuccess(result.message || "Candidature mise à jour");
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  async function handleTrial(id: number, formData: FormData) {
    const raw = formData.get("scheduledAt");
    if (typeof raw !== "string" || !raw.trim()) {
      setError("Date d'essai obligatoire");
      return;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      setError("Date d'essai invalide");
      return;
    }
    formData.set("scheduledAt", parsed.toISOString());
    await runAction(id, scheduleRecruitmentTrial, formData);
  }

  async function handleDelete(application: ApplicationData) {
    const ok = await confirm(`Supprimer la candidature de ${application.name} ?`, { variant: "danger" });
    if (!ok) return;
    setLoadingId(application.id);
    setError(null);
    try {
      const result = await deleteRecruitmentApplication(application.id);
      if (!result.success) {
        setError(result.error || "Erreur lors de la suppression");
        return;
      }
      setSuccess(result.message || "Candidature supprimée");
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      {confirmDialog}
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
        <p className="text-muted mb-0">
          Workflow contrôlé : scout → coach → essai → directeur sportif → négociation → décision.
        </p>
        <select
          className="form-select form-select-sm w-auto"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="ALL">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Candidat</th>
              <th>Catégorie / Poste</th>
              <th>Club actuel</th>
              <th>Statut</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted py-4">Aucune candidature.</td></tr>
            )}
            {applications.map((application) => {
              const busy = loadingId === application.id;
              return (
                <React.Fragment key={application.id}>
                  <tr>
                    <td>
                      <strong>{application.name}</strong>
                      <div className="small text-muted">Né(e) le {application.birthDate}</div>
                    </td>
                    <td>{application.category} — {application.position}</td>
                    <td>{application.currentClub ?? "—"}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[application.status]}`}>
                        {STATUS_LABELS[application.status]}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => setExpandedId(expandedId === application.id ? null : application.id)}
                      >
                        {expandedId === application.id ? "Fermer" : "Traiter"}
                      </button>
                      {canManage && application.status === "NEW" && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={busy}
                          onClick={() => handleDelete(application)}
                        >
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>

                  {expandedId === application.id && (
                    <tr>
                      <td colSpan={5}>
                        <div className="card card-body my-2">
                          <div className="row g-3">
                            <div className="col-12">
                              <strong>Contact :</strong> {application.parentPhone}
                              {application.email && <> — {application.email}</>}
                              {application.videoUrl && (
                                <div className="mt-1">
                                  <a href={application.videoUrl} target="_blank" rel="noreferrer">Vidéo jointe</a>
                                </div>
                              )}
                              {application.message && (
                                <div className="mt-2"><strong>Message :</strong> {application.message}</div>
                              )}
                              {application.adminNotes && (
                                <div className="mt-2 text-muted"><strong>Notes historiques :</strong> {application.adminNotes}</div>
                              )}
                            </div>

                            <div className="col-12">
                              <div className="small text-muted d-flex gap-3 flex-wrap">
                                {application.scoutReviewedAt && <span>Scout : {formatInstant(application.scoutReviewedAt)}</span>}
                                {application.coachReviewedAt && <span>Coach : {formatInstant(application.coachReviewedAt)}</span>}
                                {application.trialScheduledAt && (
                                  <span>
                                    Essai : {formatInstant(application.trialScheduledAt)}
                                    {application.trialLocation ? ` — ${application.trialLocation}` : ""}
                                  </span>
                                )}
                                {application.trialApprovedAt && <span>Essai validé : {formatInstant(application.trialApprovedAt)}</span>}
                                {application.sportingDirectorApprovedAt && (
                                  <span>Directeur sportif : {formatInstant(application.sportingDirectorApprovedAt)}</span>
                                )}
                                {application.negotiationStartedAt && (
                                  <span>Négociation : {formatInstant(application.negotiationStartedAt)}</span>
                                )}
                              </div>
                            </div>

                            {canManage && application.status === "NEW" && (
                              <form
                                className="col-12"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void runAction(application.id, approveRecruitmentScout, new FormData(event.currentTarget));
                                }}
                              >
                                <label className="form-label">Revue scout</label>
                                <textarea name="notes" className="form-control mb-2" rows={2} maxLength={2000} />
                                <button className="btn btn-primary btn-sm" disabled={busy}>Valider par le scout</button>
                              </form>
                            )}

                            {canManage && application.status === "SCOUT_APPROVED" && (
                              <form
                                className="col-12"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void runAction(application.id, approveRecruitmentCoach, new FormData(event.currentTarget));
                                }}
                              >
                                <label className="form-label">Revue coach</label>
                                <textarea name="notes" className="form-control mb-2" rows={2} maxLength={2000} />
                                <button className="btn btn-primary btn-sm" disabled={busy}>Valider par le coach</button>
                              </form>
                            )}

                            {canManage && application.status === "COACH_APPROVED" && (
                              <form
                                className="col-12 row g-2"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void handleTrial(application.id, new FormData(event.currentTarget));
                                }}
                              >
                                <div className="col-md-4">
                                  <label className="form-label">Date et heure de l&apos;essai</label>
                                  <input name="scheduledAt" type="datetime-local" className="form-control" required />
                                </div>
                                <div className="col-md-4">
                                  <label className="form-label">Lieu</label>
                                  <input name="location" className="form-control" maxLength={191} required />
                                </div>
                                <div className="col-md-4">
                                  <label className="form-label">Notes</label>
                                  <input name="notes" className="form-control" maxLength={2000} />
                                </div>
                                <div className="col-12">
                                  <button className="btn btn-warning btn-sm" disabled={busy}>Planifier l&apos;essai</button>
                                </div>
                              </form>
                            )}

                            {canManage && application.status === "TRIAL_SCHEDULED" && (
                              <form
                                className="col-12"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void runAction(application.id, approveRecruitmentTrial, new FormData(event.currentTarget));
                                }}
                              >
                                <label className="form-label">Évaluation de l&apos;essai</label>
                                <textarea
                                  name="notes"
                                  className="form-control mb-2"
                                  rows={2}
                                  maxLength={2000}
                                  defaultValue={application.trialNotes ?? ""}
                                />
                                <button className="btn btn-success btn-sm" disabled={busy}>Valider l&apos;essai</button>
                              </form>
                            )}

                            {canManage && application.status === "TRIAL_APPROVED" && (
                              <form
                                className="col-12"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void runAction(
                                    application.id,
                                    approveRecruitmentSportingDirector,
                                    new FormData(event.currentTarget),
                                  );
                                }}
                              >
                                <label className="form-label">Décision du directeur sportif</label>
                                <textarea name="notes" className="form-control mb-2" rows={2} maxLength={2000} />
                                <button className="btn btn-success btn-sm" disabled={busy}>Valider sportivement</button>
                              </form>
                            )}

                            {canManage && application.status === "SPORTING_DIRECTOR_APPROVED" && (
                              <form
                                className="col-12"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void runAction(application.id, startRecruitmentNegotiation, new FormData(event.currentTarget));
                                }}
                              >
                                <label className="form-label">Ouverture de la négociation</label>
                                <textarea
                                  name="notes"
                                  className="form-control mb-2"
                                  rows={2}
                                  maxLength={2000}
                                  placeholder="Cadre de négociation, proposition, conditions..."
                                />
                                <button className="btn btn-warning btn-sm" disabled={busy}>Démarrer la négociation</button>
                              </form>
                            )}

                            {canManage && application.status === "NEGOTIATION" && (
                              <form
                                className="col-12"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void runAction(application.id, acceptRecruitmentApplication, new FormData(event.currentTarget));
                                }}
                              >
                                <label className="form-label">Conclusion de la négociation</label>
                                <textarea
                                  name="notes"
                                  className="form-control mb-2"
                                  rows={2}
                                  maxLength={2000}
                                  defaultValue={application.negotiationNotes ?? ""}
                                />
                                <button className="btn btn-success btn-sm" disabled={busy}>Accepter la candidature</button>
                              </form>
                            )}

                            {application.status === "ACCEPTED" && (
                              <div className="col-12">
                                <div className="alert alert-success mb-0">
                                  Candidature acceptée le {formatInstant(application.acceptedAt) ?? "—"}.
                                  {application.acceptanceNotes ? ` ${application.acceptanceNotes}` : ""}
                                </div>
                              </div>
                            )}

                            {application.status === "REJECTED" && (
                              <div className="col-12">
                                <div className="alert alert-danger mb-0">
                                  Refusée le {formatInstant(application.rejectedAt) ?? "—"} — {application.rejectionReason}
                                </div>
                              </div>
                            )}

                            {canManage && REJECTABLE.has(application.status) && (
                              <form
                                className="col-12 border-top pt-3"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void runAction(application.id, rejectRecruitmentApplication, new FormData(event.currentTarget));
                                }}
                              >
                                <label className="form-label">Refuser la candidature</label>
                                <div className="input-group">
                                  <input
                                    name="reason"
                                    className="form-control"
                                    maxLength={2000}
                                    placeholder="Motif obligatoire"
                                    required
                                  />
                                  <button className="btn btn-outline-danger" disabled={busy}>Refuser</button>
                                </div>
                              </form>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
