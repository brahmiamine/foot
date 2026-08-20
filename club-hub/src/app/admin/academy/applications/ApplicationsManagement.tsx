"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AGE_CATEGORIES, AGE_CATEGORY_LABELS, type AgeCategory } from "@/types/categories";
import { useConfirm } from "@/hooks/useConfirm";
import {
  approvePlayerApplicationAdministrative,
  approvePlayerApplicationTechnical,
  createPlayerFromApplication,
  deletePlayerApplication,
  preScreenPlayerApplication,
  rejectPlayerApplication,
  schedulePlayerApplicationTrial,
} from "./actions";

type ApplicationStatus =
  | "NEW"
  | "PRE_SCREENED"
  | "TRIAL_SCHEDULED"
  | "TECHNICAL_APPROVED"
  | "ADMIN_APPROVED"
  | "PLAYER_CREATED"
  | "REJECTED";

interface ApplicationData {
  id: number;
  childLastName: string;
  childFirstName: string;
  birthDate: string;
  category: string;
  suggestedPlayerCategory: AgeCategory | null;
  position: string | null;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  message: string | null;
  documentUrl: string | null;
  status: ApplicationStatus;
  adminNotes: string | null;
  preScreeningNotes: string | null;
  preScreenedAt: string | null;
  trialScheduledAt: string | null;
  trialLocation: string | null;
  trialNotes: string | null;
  technicalApprovedAt: string | null;
  technicalNotes: string | null;
  administrativeApprovedAt: string | null;
  administrativeNotes: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  playerId: string | null;
  playerCreatedAt: string | null;
  createdAt: string;
}

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  playerId?: string;
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  NEW: "Nouvelle",
  PRE_SCREENED: "Pré-sélectionnée",
  TRIAL_SCHEDULED: "Essai planifié",
  TECHNICAL_APPROVED: "Validée techniquement",
  ADMIN_APPROVED: "Validée administrativement",
  PLAYER_CREATED: "Joueur créé",
  REJECTED: "Refusée",
};

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  NEW: "bg-primary",
  PRE_SCREENED: "bg-info text-dark",
  TRIAL_SCHEDULED: "bg-warning text-dark",
  TECHNICAL_APPROVED: "bg-success-subtle text-success",
  ADMIN_APPROVED: "bg-success",
  PLAYER_CREATED: "bg-dark",
  REJECTED: "bg-danger",
};

const REJECTABLE = new Set<ApplicationStatus>(["NEW", "PRE_SCREENED", "TRIAL_SCHEDULED", "TECHNICAL_APPROVED"]);

function formatInstant(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function ApplicationsManagement({
  initialApplications,
  canManage,
  canCreatePlayer,
}: {
  initialApplications: ApplicationData[];
  canManage: boolean;
  canCreatePlayer: boolean;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const applications = initialApplications.filter((application) => statusFilter === "ALL" || application.status === statusFilter);

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
    await runAction(id, schedulePlayerApplicationTrial, formData);
  }

  async function handleDelete(application: ApplicationData) {
    const ok = await confirm(`Supprimer la candidature de ${application.childFirstName} ${application.childLastName} ?`, {
      variant: "danger",
    });
    if (!ok) return;
    setLoadingId(application.id);
    setError(null);
    try {
      const result = await deletePlayerApplication(application.id);
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
        <p className="text-muted mb-0">Workflow contrôlé : pré-sélection → essai → validation technique → validation administrative → joueur.</p>
        <select className="form-select form-select-sm w-auto" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
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
              <th>Enfant</th>
              <th>Catégorie</th>
              <th>Parent</th>
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
                      <strong>{application.childFirstName} {application.childLastName}</strong>
                      <div className="small text-muted">Né(e) le {application.birthDate}</div>
                    </td>
                    <td>
                      {application.category}
                      {application.position && <div className="small text-muted">{application.position}</div>}
                    </td>
                    <td>
                      {application.parentName}
                      <div className="small text-muted">{application.parentPhone}</div>
                    </td>
                    <td><span className={`badge ${STATUS_BADGE[application.status]}`}>{STATUS_LABELS[application.status]}</span></td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => setExpandedId(expandedId === application.id ? null : application.id)}
                      >
                        {expandedId === application.id ? "Fermer" : "Traiter"}
                      </button>
                      {canManage && application.status === "NEW" && (
                        <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => handleDelete(application)}>
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
                              <strong>Contact :</strong> {application.parentEmail} — {application.parentPhone}
                              {application.message && <div className="mt-2"><strong>Message :</strong> {application.message}</div>}
                              {application.documentUrl && (
                                <div className="mt-2"><a href={application.documentUrl} target="_blank" rel="noreferrer">Document / photo joint(e)</a></div>
                              )}
                              {application.adminNotes && <div className="mt-2 text-muted"><strong>Notes historiques :</strong> {application.adminNotes}</div>}
                            </div>

                            <div className="col-12">
                              <div className="small text-muted d-flex gap-3 flex-wrap">
                                {application.preScreenedAt && <span>Pré-sélection : {formatInstant(application.preScreenedAt)}</span>}
                                {application.trialScheduledAt && <span>Essai : {formatInstant(application.trialScheduledAt)}{application.trialLocation ? ` — ${application.trialLocation}` : ""}</span>}
                                {application.technicalApprovedAt && <span>Technique : {formatInstant(application.technicalApprovedAt)}</span>}
                                {application.administrativeApprovedAt && <span>Administratif : {formatInstant(application.administrativeApprovedAt)}</span>}
                              </div>
                            </div>

                            {canManage && application.status === "NEW" && (
                              <form className="col-12" onSubmit={(event) => { event.preventDefault(); void runAction(application.id, preScreenPlayerApplication, new FormData(event.currentTarget)); }}>
                                <label className="form-label">Pré-sélection</label>
                                <textarea name="notes" className="form-control mb-2" rows={2} maxLength={2000} placeholder="Critères vérifiés, commentaire optionnel" />
                                <button className="btn btn-primary btn-sm" disabled={busy}>Valider la pré-sélection</button>
                              </form>
                            )}

                            {canManage && application.status === "PRE_SCREENED" && (
                              <form className="col-12 row g-2" onSubmit={(event) => { event.preventDefault(); void handleTrial(application.id, new FormData(event.currentTarget)); }}>
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
                                <div className="col-12"><button className="btn btn-warning btn-sm" disabled={busy}>Planifier l&apos;essai</button></div>
                              </form>
                            )}

                            {canManage && application.status === "TRIAL_SCHEDULED" && (
                              <form className="col-12" onSubmit={(event) => { event.preventDefault(); void runAction(application.id, approvePlayerApplicationTechnical, new FormData(event.currentTarget)); }}>
                                <label className="form-label">Compte-rendu technique</label>
                                <textarea name="notes" className="form-control mb-2" rows={2} maxLength={2000} defaultValue={application.trialNotes ?? ""} />
                                <button className="btn btn-success btn-sm" disabled={busy}>Valider techniquement</button>
                              </form>
                            )}

                            {canCreatePlayer && application.status === "TECHNICAL_APPROVED" && (
                              <form className="col-12" onSubmit={(event) => { event.preventDefault(); void runAction(application.id, approvePlayerApplicationAdministrative, new FormData(event.currentTarget)); }}>
                                <label className="form-label">Contrôle administratif</label>
                                <textarea name="notes" className="form-control mb-2" rows={2} maxLength={2000} placeholder="Dossier, identité, autorisations..." />
                                <button className="btn btn-success btn-sm" disabled={busy}>Valider administrativement</button>
                              </form>
                            )}

                            {canCreatePlayer && application.status === "ADMIN_APPROVED" && (
                              <form className="col-12 row g-2" onSubmit={(event) => { event.preventDefault(); void runAction(application.id, createPlayerFromApplication, new FormData(event.currentTarget)); }}>
                                <div className="col-md-3">
                                  <label className="form-label">Numéro</label>
                                  <input name="number" type="number" min={0} max={999} className="form-control" required />
                                </div>
                                <div className="col-md-4">
                                  <label className="form-label">Catégorie Player</label>
                                  <select name="category" className="form-select" defaultValue={application.suggestedPlayerCategory ?? ""} required>
                                    {!application.suggestedPlayerCategory && <option value="">Choisir...</option>}
                                    {AGE_CATEGORIES.map((category) => <option key={category} value={category}>{AGE_CATEGORY_LABELS[category]}</option>)}
                                  </select>
                                </div>
                                <div className="col-md-5">
                                  <label className="form-label">Poste</label>
                                  <input name="position" className="form-control" maxLength={50} defaultValue={application.position ?? ""} />
                                </div>
                                {!application.suggestedPlayerCategory && (
                                  <div className="col-12"><div className="alert alert-warning py-2 mb-0">La catégorie de candidature « {application.category} » n&apos;est pas une catégorie Player interne reconnue : sélection administrative obligatoire.</div></div>
                                )}
                                <div className="col-12"><button className="btn btn-dark btn-sm" disabled={busy}>Créer le joueur</button></div>
                              </form>
                            )}

                            {application.status === "PLAYER_CREATED" && application.playerId && (
                              <div className="col-12">
                                <div className="alert alert-success mb-0">
                                  Joueur créé le {formatInstant(application.playerCreatedAt) ?? "—"}.{" "}
                                  <Link href={`/admin/players/${application.playerId}/edit`}>Ouvrir la fiche joueur</Link>
                                </div>
                              </div>
                            )}

                            {application.status === "REJECTED" && (
                              <div className="col-12"><div className="alert alert-danger mb-0">Refusée le {formatInstant(application.rejectedAt) ?? "—"} — {application.rejectionReason}</div></div>
                            )}

                            {canManage && REJECTABLE.has(application.status) && (
                              <form className="col-12 border-top pt-3" onSubmit={(event) => { event.preventDefault(); void runAction(application.id, rejectPlayerApplication, new FormData(event.currentTarget)); }}>
                                <label className="form-label">Refuser la candidature</label>
                                <div className="input-group">
                                  <input name="reason" className="form-control" maxLength={2000} placeholder="Motif obligatoire" required />
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
