"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { AGE_CATEGORY_LABELS, type AgeCategory } from "@/types/categories";
import { createInternalTeam, updateInternalTeam, deleteInternalTeam } from "./actions";

interface SquadData {
  id: number;
  seasonId: number | null;
  seasonName: string | null;
  name: string;
  category: AgeCategory;
  gender: "male" | "female" | "mixed";
  code: string | null;
  status: "ACTIVE" | "ARCHIVED";
}

interface SeasonOption {
  id: number;
  name: string;
}

const GENDER_LABELS = { male: "Masculin", female: "Féminin", mixed: "Mixte" } as const;

export function SquadsManagement({
  initialSquads,
  seasons,
  allowedCategories,
  canManage,
}: {
  initialSquads: SquadData[];
  seasons: SeasonOption[];
  allowedCategories: readonly AgeCategory[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [editingSquad, setEditingSquad] = useState<SquadData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const openCreateForm = () => {
    setEditingSquad(null);
    setShowForm(true);
  };

  const openEditForm = (squad: SquadData) => {
    setEditingSquad(squad);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = editingSquad ? await updateInternalTeam(editingSquad.id, formData) : await createInternalTeam(formData);
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

  const handleDelete = async (squad: SquadData) => {
    if (!(await confirm(`Supprimer l'équipe interne "${squad.name}" ?`))) return;
    const result = await deleteInternalTeam(squad.id);
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
          <h1 className="h4 mb-1">Équipes internes</h1>
          <p className="text-muted mb-0">Vos équipes sportives (ex: U17 A, U17 B) — distinctes du club référentiel, une catégorie peut regrouper plusieurs équipes.</p>
        </div>
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={openCreateForm}>
            <i className="fas fa-plus me-2" aria-hidden="true" />
            Nouvelle équipe interne
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
            <h5 className="card-title mb-0 text-primary">{editingSquad ? "Modifier l'équipe interne" : "Nouvelle équipe interne"}</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-4">
                <label htmlFor="name" className="form-label">
                  Nom
                </label>
                <input type="text" id="name" name="name" className="form-control" required maxLength={100} defaultValue={editingSquad?.name ?? ""} placeholder="U17 A" />
              </div>
              <div className="col-md-3">
                <label htmlFor="category" className="form-label">
                  Catégorie
                </label>
                <select id="category" name="category" className="form-select" defaultValue={editingSquad?.category ?? allowedCategories[0] ?? "seniors"} disabled={allowedCategories.length <= 1}>
                  {allowedCategories.map((c) => (
                    <option key={c} value={c}>
                      {AGE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label htmlFor="gender" className="form-label">
                  Genre
                </label>
                <select id="gender" name="gender" className="form-select" defaultValue={editingSquad?.gender ?? "male"}>
                  <option value="male">Masculin</option>
                  <option value="female">Féminin</option>
                  <option value="mixed">Mixte</option>
                </select>
              </div>
              <div className="col-md-3">
                <label htmlFor="seasonId" className="form-label">
                  Saison
                </label>
                <select id="seasonId" name="seasonId" className="form-select" defaultValue={editingSquad?.seasonId ?? ""}>
                  <option value="">Non liée</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label htmlFor="code" className="form-label">
                  Code (optionnel)
                </label>
                <input type="text" id="code" name="code" className="form-control" maxLength={20} defaultValue={editingSquad?.code ?? ""} placeholder="U17A" />
              </div>
              {editingSquad && (
                <div className="col-md-3">
                  <label htmlFor="status" className="form-label">
                    Statut
                  </label>
                  <select id="status" name="status" className="form-select" defaultValue={editingSquad.status}>
                    <option value="ACTIVE">Active</option>
                    <option value="ARCHIVED">Archivée</option>
                  </select>
                </div>
              )}
              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                  {editingSquad ? "Enregistrer" : "Créer l'équipe interne"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {initialSquads.length === 0 ? (
            <p className="text-muted mb-0 text-center py-5">Aucune équipe interne</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Équipe</th>
                    <th>Catégorie</th>
                    <th>Genre</th>
                    <th>Saison</th>
                    <th>Statut</th>
                    {canManage && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {initialSquads.map((s) => (
                    <tr key={s.id}>
                      <td className="fw-medium">
                        {s.name} {s.code && <span className="text-muted small">({s.code})</span>}
                      </td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary">{AGE_CATEGORY_LABELS[s.category]}</span>
                      </td>
                      <td>{GENDER_LABELS[s.gender]}</td>
                      <td>{s.seasonName ?? "—"}</td>
                      <td>
                        <span className={`badge ${s.status === "ACTIVE" ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary"}`}>
                          {s.status === "ACTIVE" ? "Active" : "Archivée"}
                        </span>
                      </td>
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
