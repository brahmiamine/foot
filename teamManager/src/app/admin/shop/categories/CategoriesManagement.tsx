"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProductCategory, updateProductCategory, deleteProductCategory } from "./actions";

interface CategoryData {
  id: number;
  nameFr: string;
  nameAr: string | null;
  createdAt: string;
}

type FormMode = "add" | "edit" | null;

/**
 * Gestion des catégories de la boutique — table simple + formulaire
 * de création/édition inline (les catégories alimentent le menu déroulant
 * du formulaire produit).
 */
export function CategoriesManagement({ initialCategories }: { initialCategories: CategoryData[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const categories = initialCategories;
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        result = await createProductCategory(formData);
      } else if (formMode === "edit" && editingCategory) {
        result = await updateProductCategory(editingCategory.id, formData);
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

  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) {
      return;
    }

    setDeletingId(id);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteProductCategory(id);
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
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h4 mb-1">Catégories boutique</h1>
          <p className="text-muted mb-0">Organisez les produits de la boutique du club par catégorie.</p>
        </div>
        <div className="d-flex gap-2">
          <Link href="/admin/shop/products" className="btn btn-outline-secondary">
            <i className="fas fa-shopping-bag me-2" aria-hidden="true" />
            Voir les produits
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
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-6">
                <label htmlFor="nameFr-add" className="form-label">
                  Nom en français <span className="text-danger">*</span>
                </label>
                <input
                  id="nameFr-add"
                  name="nameFr"
                  type="text"
                  className="form-control"
                  required
                  maxLength={150}
                  placeholder="Ex: Maillots"
                  disabled={saving}
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="nameAr-add" className="form-label">
                  Nom en arabe
                </label>
                <input
                  id="nameAr-add"
                  name="nameAr"
                  type="text"
                  className="form-control"
                  maxLength={150}
                  placeholder="Ex: القمصان"
                  dir="rtl"
                  disabled={saving}
                />
              </div>
              <div className="col-12 d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Création...
                    </>
                  ) : (
                    "Créer"
                  )}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={saving}>
                  Annuler
                </button>
              </div>
            </form>
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
                        <th>Nom (FR)</th>
                        <th>Nom (AR)</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <tr key={category.id}>
                          <td>{category.nameFr}</td>
                          <td>
                            {category.nameAr ? (
                              <span dir="rtl">{category.nameAr}</span>
                            ) : (
                              <span className="text-muted">-</span>
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
                <form onSubmit={handleSubmit} className="row g-3" key={editingCategory.id}>
                  <div className="col-12">
                    <label htmlFor="nameFr-edit" className="form-label">
                      Nom en français <span className="text-danger">*</span>
                    </label>
                    <input
                      id="nameFr-edit"
                      name="nameFr"
                      type="text"
                      className="form-control"
                      required
                      maxLength={150}
                      defaultValue={editingCategory.nameFr}
                      disabled={saving}
                    />
                  </div>
                  <div className="col-12">
                    <label htmlFor="nameAr-edit" className="form-label">
                      Nom en arabe
                    </label>
                    <input
                      id="nameAr-edit"
                      name="nameAr"
                      type="text"
                      className="form-control"
                      maxLength={150}
                      defaultValue={editingCategory.nameAr || ""}
                      dir="rtl"
                      disabled={saving}
                    />
                  </div>
                  <div className="col-12 d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                          Enregistrement...
                        </>
                      ) : (
                        "Enregistrer"
                      )}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={saving}>
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
