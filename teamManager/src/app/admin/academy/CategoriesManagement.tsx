"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/hooks/useConfirm";
import { createCategory, updateCategory, deleteCategory } from "./actions";

interface CategoryData {
  id: number;
  code: string;
  nameFr: string;
  nameAr: string | null;
  ageRangeFr: string | null;
  descriptionFr: string | null;
  descriptionAr: string | null;
  isActive: boolean;
  displayOrder: number;
}

type FormMode = "add" | "edit" | null;

export function CategoriesManagement({ initialCategories }: { initialCategories: CategoryData[] }) {
  const router = useRouter();
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editing, setEditing] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);

    try {
      const result = editing ? await updateCategory(editing.id, formData) : await createCategory(formData);
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

  async function handleDelete(category: CategoryData) {
    const ok = await confirm(`Supprimer la catégorie "${category.nameFr}" ?`, { variant: "danger" });
    if (!ok) return;
    await deleteCategory(category.id);
    router.refresh();
  }

  return (
    <div>
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-muted mb-0">Catégories U6 -&gt; Seniors de la formation, affichées sur /formation.</p>
        <div className="d-flex gap-2">
          <Link href="/admin/academy/info" className="btn btn-outline-secondary btn-sm">
            Contenu éditorial
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
            <div className="col-6 col-md-2">
              <label className="form-label">Code *</label>
              <input name="code" className="form-control" placeholder="U9" required defaultValue={editing?.code ?? ""} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Tranche d&apos;âge</label>
              <input name="ageRangeFr" className="form-control" placeholder="8-9 ans" defaultValue={editing?.ageRangeFr ?? ""} />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Nom (français) *</label>
              <input name="nameFr" className="form-control" required defaultValue={editing?.nameFr ?? ""} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Ordre d&apos;affichage</label>
              <input type="number" name="displayOrder" className="form-control" defaultValue={editing?.displayOrder ?? 0} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Nom (arabe)</label>
              <input name="nameAr" className="form-control" dir="rtl" defaultValue={editing?.nameAr ?? ""} />
            </div>
            <div className="col-12 col-md-6 d-flex align-items-end">
              <div className="form-check">
                <input
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  className="form-check-input"
                  defaultChecked={editing?.isActive ?? true}
                />
                <label htmlFor="isActive" className="form-check-label">
                  Catégorie active
                </label>
              </div>
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
              <th>Code</th>
              <th>Nom</th>
              <th>Âge</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {initialCategories.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  Aucune catégorie enregistrée.
                </td>
              </tr>
            )}
            {initialCategories.map((category) => (
              <tr key={category.id}>
                <td className="fw-semibold">{category.code}</td>
                <td>{category.nameFr}</td>
                <td>{category.ageRangeFr}</td>
                <td>
                  <span className={`badge ${category.isActive ? "bg-success" : "bg-secondary"}`}>
                    {category.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-outline-secondary me-2"
                    onClick={() => {
                      setEditing(category);
                      setFormMode("edit");
                    }}
                  >
                    Modifier
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(category)}>
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
