"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { createFigure, updateFigure, deleteFigure } from "../actions";

interface FigureData {
  id: number;
  category: "PRESIDENT" | "COACH" | "PLAYER" | "TEAM";
  nameFr: string;
  nameAr: string | null;
  periodFr: string | null;
  descriptionFr: string | null;
  descriptionAr: string | null;
  photoUrl: string | null;
  displayOrder: number;
}

const CATEGORY_LABELS: Record<FigureData["category"], string> = {
  PRESIDENT: "Président historique",
  COACH: "Entraîneur historique",
  PLAYER: "Grande figure",
  TEAM: "Grande équipe",
};

type FormMode = "add" | "edit" | null;

export function FiguresManagement({ initialFigures }: { initialFigures: FigureData[] }) {
  const router = useRouter();
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editing, setEditing] = useState<FigureData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);

    try {
      const result = editing ? await updateFigure(editing.id, formData) : await createFigure(formData);
      if (result.success) {
        setFormMode(null);
        setEditing(null);
        router.refresh();
      } else {
        setError(result.error || "Erreur");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(figure: FigureData) {
    const ok = await confirm(`Supprimer "${figure.nameFr}" ?`, { variant: "danger" });
    if (!ok) return;
    await deleteFigure(figure.id);
    router.refresh();
  }

  return (
    <div>
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-muted mb-0">Présidents, entraîneurs, joueurs et équipes qui ont marqué l&apos;histoire du club.</p>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setEditing(null);
            setFormMode(formMode === "add" ? null : "add");
          }}
        >
          {formMode === "add" ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {formMode && (
        <form onSubmit={handleSubmit} className="card mb-4">
          <div className="card-body row g-3">
            {error && (
              <div className="col-12">
                <div className="alert alert-danger mb-0">{error}</div>
              </div>
            )}
            <div className="col-12 col-md-4">
              <label className="form-label">Catégorie *</label>
              <select name="category" className="form-select" required defaultValue={editing?.category ?? "PRESIDENT"}>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Période (ex: 1985-1990)</label>
              <input name="periodFr" className="form-control" defaultValue={editing?.periodFr ?? ""} />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Ordre d&apos;affichage</label>
              <input type="number" name="displayOrder" className="form-control" defaultValue={editing?.displayOrder ?? 0} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Nom (français) *</label>
              <input name="nameFr" className="form-control" required defaultValue={editing?.nameFr ?? ""} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Nom (arabe)</label>
              <input name="nameAr" className="form-control" dir="rtl" defaultValue={editing?.nameAr ?? ""} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Description (français)</label>
              <textarea name="descriptionFr" className="form-control" rows={3} defaultValue={editing?.descriptionFr ?? ""} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Description (arabe)</label>
              <textarea name="descriptionAr" className="form-control" rows={3} dir="rtl" defaultValue={editing?.descriptionAr ?? ""} />
            </div>
            <div className="col-12">
              <label className="form-label">Photo (URL)</label>
              <input name="photoUrl" className="form-control" defaultValue={editing?.photoUrl ?? ""} />
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Enregistrement..." : editing ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Nom</th>
              <th>Période</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {initialFigures.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted py-4">
                  Aucune figure enregistrée.
                </td>
              </tr>
            )}
            {initialFigures.map((figure) => (
              <tr key={figure.id}>
                <td>{CATEGORY_LABELS[figure.category]}</td>
                <td>{figure.nameFr}</td>
                <td>{figure.periodFr}</td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-outline-secondary me-2"
                    onClick={() => {
                      setEditing(figure);
                      setFormMode("edit");
                    }}
                  >
                    Modifier
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(figure)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
