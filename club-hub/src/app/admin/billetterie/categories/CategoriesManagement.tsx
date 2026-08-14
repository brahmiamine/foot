"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/hooks/useConfirm";
import { createTicketCategory, updateTicketCategory, deleteTicketCategory } from "./actions";

interface CategoryData {
  id: string;
  name: string;
  description: string | null;
  basePrice: string;
  isActive: boolean;
}

type FormMode = "add" | "edit" | null;

/**
 * Gestion des catégories de ticketing du club — table simple + formulaire
 * de création/édition inline. Ces catégories alimentent le sélecteur de
 * catégorie lors de la configuration de la ticketing d'un match (voir
 * /admin/ticketing/matches).
 */
export function CategoriesManagement({ initialCategories }: { initialCategories: CategoryData[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const categories = initialCategories;
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const resetForm = () => {
    setFormMode(null);
    setEditingCategory(null);
  };

  const handleAddClick = () => {
    setEditingCategory(null);
    setFormMode("add");
    setError(null);
    setSuccess(null);
  };

  const handleEditClick = (category: CategoryData) => {
    setEditingCategory(category);
    setFormMode("edit");
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData(e.currentTarget);
      let result;
      if (formMode === "add") {
        result = await createTicketCategory(formData);
      } else if (formMode === "edit" && editingCategory) {
        result = await updateTicketCategory(editingCategory.id, formData);
      } else {
        return;
      }

      if (result.success) {
        setSuccess(result.message || "Catégorie enregistrée avec succès");
        resetForm();
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Une erreur est survenue");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?"))) {
      return;
    }

    setDeletingId(id);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteTicketCategory(id);
      if (result.success) {
        setSuccess(result.message || "Catégorie supprimée avec succès");
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de la suppression");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h4 mb-1">Catégories de billets</h1>
          <p className="text-muted mb-0">
            Définissez les catégories de billets du club (Gradin, Chaise, VIP, …) — un prix de base indicatif, ajustable
            par match lors de la configuration de la ticketing.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link href="/admin/ticketing/matches" className="btn btn-outline-secondary">
            <i className="fas fa-futbol me-2" aria-hidden="true" />
            Billetterie par match
          </Link>
          <button type="button" className="btn btn-primary" onClick={handleAddClick} disabled={saving || isPending}>
            <i className="fas fa-plus me-2" aria-hidden="true" />
            Ajouter une catégorie
          </button>
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

      {formMode === "add" && (
        <div className="card border border-success mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-success">Ajouter une catégorie</h5>
            <button type="button" onClick={resetForm} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <CategoryForm formId="add" saving={saving} onSubmit={handleSubmit} onCancel={resetForm} />
          </div>
        </div>
      )}

      <div className="row">
        <div className={`col-12 ${formMode === "edit" ? "col-lg-7" : "col-lg-12"}`}>
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Liste des catégories</h5>
            </div>
            <div className="card-body">
              {categories.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-3">Aucune catégorie enregistrée</p>
                  <button type="button" className="btn btn-primary" onClick={handleAddClick}>
                    Ajouter la première catégorie
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Nom</th>
                        <th>Prix de base</th>
                        <th>Statut</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <tr key={category.id}>
                          <td>
                            {category.name}
                            {category.description && (
                              <div className="text-muted small">{category.description}</div>
                            )}
                          </td>
                          <td>{Number(category.basePrice).toFixed(3)} DT</td>
                          <td>
                            {category.isActive ? (
                              <span className="badge bg-success-subtle text-success">Active</span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-secondary">Inactive</span>
                            )}
                          </td>
                          <td className="text-end">
                            <div className="btn-group" role="group">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEditClick(category)}
                                disabled={saving || isPending}
                              >
                                <i className="fas fa-edit" aria-hidden="true" />
                                <span className="visually-hidden">Modifier</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(category.id)}
                                disabled={deletingId === category.id || isPending}
                              >
                                {deletingId === category.id ? (
                                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                ) : (
                                  <i className="fas fa-trash" aria-hidden="true" />
                                )}
                                <span className="visually-hidden">Supprimer</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {formMode === "edit" && editingCategory && (
          <div className="col-12 col-lg-5 mt-4 mt-lg-0">
            <div className="card border border-primary">
              <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 text-primary">Modifier la catégorie</h5>
                <button type="button" className="btn-close" onClick={resetForm} aria-label="Fermer" />
              </div>
              <div className="card-body">
                <CategoryForm
                  formId="edit"
                  saving={saving}
                  onSubmit={handleSubmit}
                  onCancel={resetForm}
                  category={editingCategory}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryForm({
  formId,
  saving,
  onSubmit,
  onCancel,
  category,
}: {
  formId: string;
  saving: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  category?: CategoryData;
}) {
  return (
    <form onSubmit={onSubmit} className="row g-3" key={category?.id ?? "new"}>
      <div className="col-12">
        <label htmlFor={`name-${formId}`} className="form-label">
          Nom <span className="text-danger">*</span>
        </label>
        <input
          id={`name-${formId}`}
          name="name"
          type="text"
          className="form-control"
          required
          maxLength={191}
          placeholder="Ex: Gradin"
          defaultValue={category?.name}
          disabled={saving}
        />
      </div>
      <div className="col-12">
        <label htmlFor={`description-${formId}`} className="form-label">
          Description
        </label>
        <textarea
          id={`description-${formId}`}
          name="description"
          className="form-control"
          rows={2}
          defaultValue={category?.description ?? ""}
          disabled={saving}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor={`basePrice-${formId}`} className="form-label">
          Prix de base (DT) <span className="text-danger">*</span>
        </label>
        <input
          id={`basePrice-${formId}`}
          name="basePrice"
          type="number"
          step="0.001"
          min="0"
          className="form-control"
          required
          defaultValue={category?.basePrice}
          disabled={saving}
        />
      </div>
      <div className="col-md-6 d-flex align-items-end">
        <div className="form-check">
          <input
            id={`isActive-${formId}`}
            name="isActive"
            type="checkbox"
            className="form-check-input"
            defaultChecked={category?.isActive ?? true}
            disabled={saving}
          />
          <label htmlFor={`isActive-${formId}`} className="form-check-label">
            Catégorie active
          </label>
        </div>
      </div>
      <div className="col-12 d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              Enregistrement...
            </>
          ) : category ? (
            "Enregistrer"
          ) : (
            "Créer"
          )}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Annuler
        </button>
      </div>
    </form>
  );
}
