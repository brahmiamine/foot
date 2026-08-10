"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { createSeason, updateSeason, deleteSeason } from "./actions";

type SeasonStatus = "PLANNED" | "ACTIVE" | "ARCHIVED";

interface SeasonData {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: SeasonStatus;
  isCurrent: boolean;
}

const STATUS_LABELS: Record<SeasonStatus, string> = { PLANNED: "Planifiée", ACTIVE: "Active", ARCHIVED: "Archivée" };
const STATUS_BADGES: Record<SeasonStatus, string> = {
  PLANNED: "bg-info-subtle text-info",
  ACTIVE: "bg-success-subtle text-success",
  ARCHIVED: "bg-secondary-subtle text-secondary",
};

export function SeasonsManagement({ initialSeasons, canManage }: { initialSeasons: SeasonData[]; canManage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [editingSeason, setEditingSeason] = useState<SeasonData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const openCreateForm = () => {
    setEditingSeason(null);
    setShowForm(true);
  };

  const openEditForm = (season: SeasonData) => {
    setEditingSeason(season);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = editingSeason ? await updateSeason(editingSeason.id, formData) : await createSeason(formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        setShowForm(false);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (season: SeasonData) => {
    if (!(await confirm(`Supprimer la saison "${season.name}" ?`))) return;
    const result = await deleteSeason(season.id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Saisons</h1>
          <p className="text-muted mb-0">Saison sportive interne du club (ex: 2026/2027) — contexte des équipes internes, licences et effectifs.</p>
        </div>
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={openCreateForm}>
            <i className="fas fa-plus me-2" aria-hidden="true" />
            Nouvelle saison
          </button>
        )}
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

      {showForm && (
        <div className="card border border-primary mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-primary">{editingSeason ? "Modifier la saison" : "Nouvelle saison"}</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-4">
                <label htmlFor="name" className="form-label">
                  Nom
                </label>
                <input type="text" id="name" name="name" className="form-control" required maxLength={50} defaultValue={editingSeason?.name ?? ""} placeholder="2026/2027" />
              </div>
              <div className="col-md-4">
                <label htmlFor="startDate" className="form-label">
                  Début
                </label>
                <input type="date" id="startDate" name="startDate" className="form-control" defaultValue={editingSeason?.startDate ?? ""} />
              </div>
              <div className="col-md-4">
                <label htmlFor="endDate" className="form-label">
                  Fin
                </label>
                <input type="date" id="endDate" name="endDate" className="form-control" defaultValue={editingSeason?.endDate ?? ""} />
              </div>
              <div className="col-md-6">
                <label htmlFor="status" className="form-label">
                  Statut
                </label>
                <select id="status" name="status" className="form-select" defaultValue={editingSeason?.status ?? "PLANNED"}>
                  {(Object.keys(STATUS_LABELS) as SeasonStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 d-flex align-items-end">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="isCurrent" name="isCurrent" defaultChecked={editingSeason?.isCurrent ?? false} />
                  <label className="form-check-label" htmlFor="isCurrent">
                    Saison courante (par défaut partout)
                  </label>
                </div>
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                  {editingSeason ? "Enregistrer" : "Créer la saison"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {initialSeasons.length === 0 ? (
            <p className="text-muted mb-0 text-center py-5">Aucune saison</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Saison</th>
                    <th>Période</th>
                    <th>Statut</th>
                    <th>Courante</th>
                    {canManage && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {initialSeasons.map((s) => (
                    <tr key={s.id}>
                      <td className="fw-medium">{s.name}</td>
                      <td className="text-muted small">
                        {s.startDate ? new Date(s.startDate).toLocaleDateString("fr-FR") : "—"} → {s.endDate ? new Date(s.endDate).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGES[s.status]}`}>{STATUS_LABELS[s.status]}</span>
                      </td>
                      <td>{s.isCurrent ? <span className="badge bg-primary">Courante</span> : "—"}</td>
                      {canManage && (
                        <td className="text-end">
                          <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditForm(s)}>
                              <i className="fas fa-edit" aria-hidden="true" />
                            </button>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(s)} disabled={isPending}>
                              <i className="fas fa-trash" aria-hidden="true" />
                            </button>
                          </div>
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
    </div>
  );
}
