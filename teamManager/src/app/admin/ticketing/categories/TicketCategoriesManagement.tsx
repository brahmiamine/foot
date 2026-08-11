"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { createTicketCategory, updateTicketCategory, deleteTicketCategory } from "./actions";

interface CategoryData {
  id: number;
  name: string;
  nameAr: string | null;
  description: string | null;
  price: number;
  color: string | null;
  isActive: boolean;
  displayOrder: number;
}

export function TicketCategoriesManagement({ initialCategories, canManage }: { initialCategories: CategoryData[]; canManage: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CategoryData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreateForm = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEditForm = (category: CategoryData) => {
    setEditing(category);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = editing ? await updateTicketCategory(editing.id, formData) : await createTicketCategory(formData);
      if (result.success) {
        setShowForm(false);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: CategoryData) => {
    if (!(await confirm(`Supprimer la catégorie "${category.name}" ?`))) return;
    const result = await deleteTicketCategory(category.id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  const sorted = [...initialCategories].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Catégories de billets</h1>
          <p className="text-muted mb-0">Catalogue réutilisable de catégories (Gradin, Chaise, VIP...), propre au club.</p>
        </div>
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={openCreateForm}>
            <i className="fas fa-plus me-2" aria-hidden="true" />
            Nouvelle catégorie
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      {showForm && (
        <div className="card border border-primary mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-primary">{editing ? "Modifier la catégorie" : "Nouvelle catégorie"}</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-4">
                <label htmlFor="name" className="form-label">
                  Nom <span className="text-danger">*</span>
                </label>
                <input type="text" id="name" name="name" className="form-control" required maxLength={100} defaultValue={editing?.name ?? ""} placeholder="Ex: Gradin populaire" />
              </div>
              <div className="col-md-4">
                <label htmlFor="nameAr" className="form-label">
                  Nom (arabe)
                </label>
                <input type="text" id="nameAr" name="nameAr" className="form-control" dir="rtl" maxLength={100} defaultValue={editing?.nameAr ?? ""} />
              </div>
              <div className="col-md-2">
                <label htmlFor="price" className="form-label">
                  Prix indicatif (DT)
                </label>
                <input type="number" id="price" name="price" className="form-control" step="0.001" min={0} defaultValue={editing?.price ?? 0} />
              </div>
              <div className="col-md-2">
                <label htmlFor="color" className="form-label">
                  Couleur
                </label>
                <input type="color" id="color" name="color" className="form-control form-control-color w-100" defaultValue={editing?.color ?? "#0d6efd"} />
              </div>

              <div className="col-md-8">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <input type="text" id="description" name="description" className="form-control" maxLength={500} defaultValue={editing?.description ?? ""} />
              </div>
              <div className="col-md-2">
                <label htmlFor="displayOrder" className="form-label">
                  Ordre d&apos;affichage
                </label>
                <input type="number" id="displayOrder" name="displayOrder" className="form-control" min={0} defaultValue={editing?.displayOrder ?? 0} />
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="isActive" name="isActive" defaultChecked={editing?.isActive ?? true} />
                  <label className="form-check-label" htmlFor="isActive">
                    Active
                  </label>
                </div>
              </div>

              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                  {editing ? "Enregistrer" : "Créer la catégorie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucune catégorie de billet définie</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th />
                  <th>Nom</th>
                  <th>Prix indicatif</th>
                  <th>Statut</th>
                  {canManage && <th className="text-end">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="d-inline-block rounded" style={{ width: 18, height: 18, backgroundColor: c.color ?? "#adb5bd" }} />
                    </td>
                    <td>
                      <div className="fw-semibold">{c.name}</div>
                      {c.nameAr && <div className="text-muted small" dir="rtl">{c.nameAr}</div>}
                      {c.description && <div className="text-muted small">{c.description}</div>}
                    </td>
                    <td>{c.price.toFixed(3)} DT</td>
                    <td>
                      {c.isActive ? <span className="badge bg-success-subtle text-success">Active</span> : <span className="badge bg-secondary-subtle text-secondary">Inactive</span>}
                    </td>
                    {canManage && (
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => openEditForm(c)}>
                          <i className="fas fa-edit" aria-hidden="true" />
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c)}>
                          <i className="fas fa-trash" aria-hidden="true" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
