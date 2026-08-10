"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { PLAYER_OBJECTIVE_STATUSES } from "@/types/evaluations";
import { createEvaluation, deleteEvaluation, createObjective, setObjectiveStatus, deleteObjective } from "./actions";

const OBJECTIVE_STATUS_LABELS: Record<string, string> = { IN_PROGRESS: "En cours", ACHIEVED: "Atteint", MISSED: "Manqué" };
const OBJECTIVE_STATUS_BADGES: Record<string, string> = { IN_PROGRESS: "bg-secondary", ACHIEVED: "bg-success", MISSED: "bg-danger" };

interface EvaluationData {
  id: number;
  playerId: string;
  playerName: string;
  evaluationDate: string;
  technicalScore: number | null;
  tacticalScore: number | null;
  physicalScore: number | null;
  mentalScore: number | null;
  comment: string | null;
}

interface ObjectiveData {
  id: number;
  playerId: string;
  playerName: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: string;
}

interface PlayerOption {
  id: string;
  label: string;
}

interface SeasonOption {
  id: number;
  name: string;
}

function averageScore(e: EvaluationData): string {
  const scores = [e.technicalScore, e.tacticalScore, e.physicalScore, e.mentalScore].filter((s): s is number => s != null);
  if (scores.length === 0) return "—";
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
}

export function EvaluationsManagement({
  initialEvaluations,
  initialObjectives,
  players,
  seasons,
  canManage,
}: {
  initialEvaluations: EvaluationData[];
  initialObjectives: ObjectiveData[];
  players: PlayerOption[];
  seasons: SeasonOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showEvalForm, setShowEvalForm] = useState(false);
  const [showObjectiveForm, setShowObjectiveForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleEvalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);
    const result = await createEvaluation(formData);
    if (result.success) {
      setSuccess(result.message ?? null);
      setShowEvalForm(false);
      (e.target as HTMLFormElement).reset();
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur");
    }
  };

  const handleDeleteEval = async (evaluation: EvaluationData) => {
    if (!(await confirm(`Supprimer l'évaluation de ${evaluation.playerName} du ${evaluation.evaluationDate} ?`))) return;
    const result = await deleteEvaluation(evaluation.id);
    if (result.success) startTransition(() => router.refresh());
    else setError(result.error || "Erreur lors de la suppression");
  };

  const handleObjectiveSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await createObjective(formData);
    if (result.success) {
      setShowObjectiveForm(false);
      (e.target as HTMLFormElement).reset();
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur");
    }
  };

  const handleObjectiveStatus = async (objective: ObjectiveData, status: string) => {
    const result = await setObjectiveStatus(objective.id, status);
    if (result.success) startTransition(() => router.refresh());
    else setError(result.error || "Erreur");
  };

  const handleDeleteObjective = async (objective: ObjectiveData) => {
    const result = await deleteObjective(objective.id);
    if (result.success) startTransition(() => router.refresh());
    else setError(result.error || "Erreur lors de la suppression");
  };

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Évaluations joueurs</h1>
          <p className="text-muted mb-0">Suivi de la progression (technique/tactique/physique/mentale, sur 20) et objectifs individuels.</p>
        </div>
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

      <div className="card mb-4">
        <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
          <h6 className="card-title mb-0">Évaluations</h6>
          {canManage && (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setShowEvalForm((v) => !v)}>
              <i className="fas fa-plus me-1" aria-hidden="true" />
              {showEvalForm ? "Annuler" : "Nouvelle évaluation"}
            </button>
          )}
        </div>
        {showEvalForm && (
          <div className="card-body border-bottom">
            <form onSubmit={handleEvalSubmit} className="row g-2 align-items-end">
              <div className="col-md-3">
                <label className="form-label small mb-1">Joueur</label>
                <select name="playerId" className="form-select form-select-sm" required defaultValue="">
                  <option value="" disabled>
                    Choisir
                  </option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-1">Date</label>
                <input type="date" name="evaluationDate" className="form-control form-control-sm" required defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-1">Saison</label>
                <select name="seasonId" className="form-select form-select-sm" defaultValue="">
                  <option value="">—</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-1">
                <label className="form-label small mb-1">Tech.</label>
                <input type="number" name="technicalScore" min={0} max={20} className="form-control form-control-sm" />
              </div>
              <div className="col-md-1">
                <label className="form-label small mb-1">Tact.</label>
                <input type="number" name="tacticalScore" min={0} max={20} className="form-control form-control-sm" />
              </div>
              <div className="col-md-1">
                <label className="form-label small mb-1">Phys.</label>
                <input type="number" name="physicalScore" min={0} max={20} className="form-control form-control-sm" />
              </div>
              <div className="col-md-1">
                <label className="form-label small mb-1">Ment.</label>
                <input type="number" name="mentalScore" min={0} max={20} className="form-control form-control-sm" />
              </div>
              <div className="col-md-10">
                <label className="form-label small mb-1">Commentaire</label>
                <input type="text" name="comment" className="form-control form-control-sm" maxLength={1000} />
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-sm btn-primary w-100">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        )}
        <div className="card-body">
          {initialEvaluations.length === 0 ? (
            <p className="text-muted mb-0">Aucune évaluation enregistrée.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Joueur</th>
                    <th>Date</th>
                    <th>Tech.</th>
                    <th>Tact.</th>
                    <th>Phys.</th>
                    <th>Ment.</th>
                    <th>Moyenne</th>
                    <th>Commentaire</th>
                    {canManage && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {initialEvaluations.map((e) => (
                    <tr key={e.id}>
                      <td>{e.playerName}</td>
                      <td>{new Date(e.evaluationDate).toLocaleDateString("fr-FR")}</td>
                      <td>{e.technicalScore ?? "—"}</td>
                      <td>{e.tacticalScore ?? "—"}</td>
                      <td>{e.physicalScore ?? "—"}</td>
                      <td>{e.mentalScore ?? "—"}</td>
                      <td>
                        <strong>{averageScore(e)}</strong>
                      </td>
                      <td>{e.comment ?? "—"}</td>
                      {canManage && (
                        <td className="text-end">
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteEval(e)} disabled={isPending}>
                            <i className="fas fa-trash" aria-hidden="true" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
          <h6 className="card-title mb-0">Objectifs individuels</h6>
          {canManage && (
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowObjectiveForm((v) => !v)}>
              <i className="fas fa-plus me-1" aria-hidden="true" />
              {showObjectiveForm ? "Annuler" : "Nouvel objectif"}
            </button>
          )}
        </div>
        {showObjectiveForm && (
          <div className="card-body border-bottom">
            <form onSubmit={handleObjectiveSubmit} className="row g-2 align-items-end">
              <div className="col-md-3">
                <label className="form-label small mb-1">Joueur</label>
                <select name="playerId" className="form-select form-select-sm" required defaultValue="">
                  <option value="" disabled>
                    Choisir
                  </option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small mb-1">Titre</label>
                <input type="text" name="title" className="form-control form-control-sm" required maxLength={200} />
              </div>
              <div className="col-md-3">
                <label className="form-label small mb-1">Description</label>
                <input type="text" name="description" className="form-control form-control-sm" maxLength={500} />
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-1">Échéance</label>
                <input type="date" name="targetDate" className="form-control form-control-sm" />
              </div>
              <div className="col-md-1">
                <button type="submit" className="btn btn-sm btn-primary w-100">
                  <i className="fas fa-plus" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        )}
        <div className="card-body">
          {initialObjectives.length === 0 ? (
            <p className="text-muted mb-0">Aucun objectif enregistré.</p>
          ) : (
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>Joueur</th>
                  <th>Titre</th>
                  <th>Échéance</th>
                  <th>Statut</th>
                  {canManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {initialObjectives.map((o) => (
                  <tr key={o.id}>
                    <td>{o.playerName}</td>
                    <td>
                      {o.title}
                      {o.description && <div className="text-muted small">{o.description}</div>}
                    </td>
                    <td>{o.targetDate ? new Date(o.targetDate).toLocaleDateString("fr-FR") : "—"}</td>
                    <td>
                      {canManage ? (
                        <select className="form-select form-select-sm" style={{ width: "auto" }} value={o.status} onChange={(e) => handleObjectiveStatus(o, e.target.value)}>
                          {PLAYER_OBJECTIVE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {OBJECTIVE_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`badge ${OBJECTIVE_STATUS_BADGES[o.status]}`}>{OBJECTIVE_STATUS_LABELS[o.status]}</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteObjective(o)}>
                          <i className="fas fa-trash" aria-hidden="true" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
