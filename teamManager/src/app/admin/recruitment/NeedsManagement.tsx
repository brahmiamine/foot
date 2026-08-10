"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/hooks/useConfirm";
import { createNeed, updateNeed, deleteNeed } from "./actions";

interface NeedData {
  id: number;
  category: string;
  position: string;
  descriptionFr: string | null;
  descriptionAr: string | null;
  isActive: boolean;
  displayOrder: number;
}

type FormMode = "add" | "edit" | null;

export function NeedsManagement({ initialNeeds }: { initialNeeds: NeedData[] }) {
  const router = useRouter();
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editing, setEditing] = useState<NeedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);

    try {
      const result = editing ? await updateNeed(editing.id, formData) : await createNeed(formData);
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

  async function handleDelete(need: NeedData) {
    const ok = await confirm(`Retirer le poste "${need.category} — ${need.position}" ?`, { variant: "danger" });
    if (!ok) return;
    await deleteNeed(need.id);
    router.refresh();
  }

  return (
    <div>
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-muted mb-0">Postes/catégories recherchés, affichés sur la page publique /recrutement.</p>
        <div className="d-flex gap-2">
          <Link href="/admin/recruitment/applications" className="btn btn-outline-secondary btn-sm">
            Candidatures reçues
          </Link>
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
              <input name="category" className="form-control" placeholder="U15" required defaultValue={editing?.category ?? ""} />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Poste *</label>
              <input name="position" className="form-control" placeholder="Défenseur central" required defaultValue={editing?.position ?? ""} />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Ordre d&apos;affichage</label>
              <input type="number" name="displayOrder" className="form-control" defaultValue={editing?.displayOrder ?? 0} />
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
              <div className="form-check">
                <input
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  className="form-check-input"
                  defaultChecked={editing?.isActive ?? true}
                />
                <label htmlFor="isActive" className="form-check-label">
                  Recherche active
                </label>
              </div>
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
              <th>Poste</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {initialNeeds.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted py-4">
                  Aucun poste recherché.
                </td>
              </tr>
            )}
            {initialNeeds.map((need) => (
              <tr key={need.id}>
                <td>{need.category}</td>
                <td>{need.position}</td>
                <td>
                  <span className={`badge ${need.isActive ? "bg-success" : "bg-secondary"}`}>
                    {need.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-outline-secondary me-2"
                    onClick={() => {
                      setEditing(need);
                      setFormMode("edit");
                    }}
                  >
                    Modifier
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(need)}>
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
