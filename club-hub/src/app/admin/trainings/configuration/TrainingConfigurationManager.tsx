"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTrainingFromTemplate,
  deleteTrainingTemplate,
  lockTrainingInvitations,
  saveTrainingAsTemplate,
  updateTrainingResponsePolicy,
} from "./actions";

interface TrainingConfigRow {
  id: number;
  title: string;
  category: string;
  date: string;
  status: string;
  responseDeadline: string | null;
  reminderOffsetMinutes: number;
  invitationsLocked: boolean;
  invitationCount: number;
  rsvpPending: number;
  rsvpAccepted: number;
  rsvpDeclined: number;
}

interface TemplateRow {
  id: number;
  name: string;
  title: string;
  category: string;
  durationMinutes: number | null;
  responseDeadlineOffsetMinutes: number;
  reminderOffsetMinutes: number;
}

function localDateTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TrainingConfigurationManager({
  trainings,
  templates,
  canEdit,
  canCreate,
}: {
  trainings: TrainingConfigRow[];
  templates: TemplateRow[];
  canEdit: boolean;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function run(action: () => Promise<{ success: boolean; error?: string; message?: string }>) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      setNotice(result.message ?? "Enregistré");
      router.refresh();
    });
  }

  return (
    <div className="container-fluid px-0">
      <div className="mb-4">
        <h1 className="h4 mb-1">Configuration des entraînements</h1>
        <p className="text-muted mb-0">Deadlines RSVP, verrouillage des invitations, rappels et modèles réutilisables.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <section className="mb-5">
        <h2 className="h5 mb-3">Séances planifiées</h2>
        <div className="row g-3">
          {trainings.map((training) => (
            <div className="col-12 col-xl-6" key={training.id}>
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between gap-2 align-items-start mb-3">
                    <div>
                      <div className="fw-semibold">{training.title}</div>
                      <div className="small text-muted">{training.category} · {new Date(training.date).toLocaleString("fr-FR")}</div>
                    </div>
                    <span className={`badge ${training.invitationsLocked ? "bg-secondary" : "bg-success"}`}>
                      {training.invitationsLocked ? "Roster verrouillé" : "Roster ouvert"}
                    </span>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mb-3 small">
                    <span className="badge bg-light text-dark">Invités {training.invitationCount}</span>
                    <span className="badge bg-warning text-dark">RSVP attente {training.rsvpPending}</span>
                    <span className="badge bg-success">Confirmés {training.rsvpAccepted}</span>
                    <span className="badge bg-danger">Refus {training.rsvpDeclined}</span>
                  </div>

                  <form
                    className="row g-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      run(() => updateTrainingResponsePolicy(formData));
                    }}
                  >
                    <input type="hidden" name="trainingId" value={training.id} />
                    <div className="col-md-7">
                      <label className="form-label small">Deadline de réponse</label>
                      <input
                        className="form-control"
                        type="datetime-local"
                        name="responseDeadline"
                        defaultValue={localDateTime(training.responseDeadline)}
                        disabled={!canEdit || training.invitationsLocked || training.status !== "SCHEDULED"}
                      />
                    </div>
                    <div className="col-md-5">
                      <label className="form-label small">Rappel avant deadline (min)</label>
                      <input
                        className="form-control"
                        type="number"
                        name="reminderOffsetMinutes"
                        min={0}
                        max={10080}
                        defaultValue={training.reminderOffsetMinutes}
                        disabled={!canEdit || training.invitationsLocked || training.status !== "SCHEDULED"}
                      />
                    </div>
                    {canEdit && !training.invitationsLocked && training.status === "SCHEDULED" && (
                      <div className="col-12">
                        <button className="btn btn-primary btn-sm" disabled={pending}>Enregistrer la politique</button>
                      </div>
                    )}
                  </form>

                  {canEdit && training.status === "SCHEDULED" && !training.invitationsLocked && (
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        disabled={pending}
                        onClick={() => {
                          if (window.confirm("Verrouiller définitivement le roster de cette séance ?")) {
                            run(() => lockTrainingInvitations(training.id));
                          }
                        }}
                      >
                        Verrouiller le roster
                      </button>
                    </div>
                  )}

                  {canEdit && (
                    <form
                      className="input-group input-group-sm mt-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        run(() => saveTrainingAsTemplate(formData));
                      }}
                    >
                      <input type="hidden" name="trainingId" value={training.id} />
                      <input className="form-control" name="name" minLength={2} maxLength={120} placeholder="Nom du modèle" required />
                      <button className="btn btn-outline-primary" disabled={pending}>Créer un modèle</button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
          {trainings.length === 0 && <div className="text-muted">Aucune séance visible.</div>}
        </div>
      </section>

      <section>
        <h2 className="h5 mb-3">Modèles réutilisables</h2>
        <div className="row g-3">
          {templates.map((template) => (
            <div className="col-12 col-lg-6" key={template.id}>
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between gap-2">
                    <div>
                      <div className="fw-semibold">{template.name}</div>
                      <div className="small text-muted">{template.category} · {template.title}</div>
                    </div>
                    {canEdit && (
                      <button className="btn btn-link text-danger btn-sm" disabled={pending} onClick={() => run(() => deleteTrainingTemplate(template.id))}>
                        Supprimer
                      </button>
                    )}
                  </div>
                  <div className="small text-muted mt-2">
                    Deadline J-{Math.round(template.responseDeadlineOffsetMinutes / 1440 * 10) / 10} · rappel {template.reminderOffsetMinutes} min avant.
                  </div>
                  {canCreate && (
                    <form
                      className="input-group input-group-sm mt-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        run(() => createTrainingFromTemplate(formData));
                      }}
                    >
                      <input type="hidden" name="templateId" value={template.id} />
                      <input className="form-control" type="datetime-local" name="date" required />
                      <button className="btn btn-primary" disabled={pending}>Créer la séance</button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
          {templates.length === 0 && <div className="text-muted">Aucun modèle enregistré.</div>}
        </div>
      </section>
    </div>
  );
}
