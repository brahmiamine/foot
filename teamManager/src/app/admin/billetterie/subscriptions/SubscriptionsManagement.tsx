"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/hooks/useConfirm";
import { createSubscriptionCategory, updateSubscriptionCategory, deleteSubscriptionCategory } from "./actions";

interface CategoryData {
  id: string;
  name: string;
  description: string | null;
  price: string;
  color: string | null;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

interface SubscriberData {
  id: string;
  reference: string;
  categoryName: string;
  purchaserName: string;
  purchaserEmail: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  validFrom: string;
  validUntil: string;
  lastValidatedOn: string | null;
  revoked: boolean;
}

type FormMode = "add" | "edit" | null;

const STATUS_LABELS: Record<SubscriberData["status"], string> = {
  PENDING: "En attente",
  PAID: "Payé",
  CANCELLED: "Annulé",
};

/**
 * Gestion des abonnements de saison du club — catégories (nom/prix/couleur/
 * fenêtre de validité) éditables ici, plus roster en lecture seule des
 * abonnés (achetés côté app générique `billetterie`, jamais modifiés
 * depuis cette page).
 */
export function SubscriptionsManagement({
  initialCategories,
  subscribers,
}: {
  initialCategories: CategoryData[];
  subscribers: SubscriberData[];
}) {
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
        result = await createSubscriptionCategory(formData);
      } else if (formMode === "edit" && editingCategory) {
        result = await updateSubscriptionCategory(editingCategory.id, formData);
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
      const result = await deleteSubscriptionCategory(id);
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
          <h1 className="h4 mb-1">Abonnements de saison</h1>
          <p className="text-muted mb-0">
            Définissez les catégories d&apos;abonnement du club (Or, Argent, Bronze, …) — prix, couleur et fenêtre de
            validité de saison, vendues sur l&apos;app billetterie.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link href="/admin/billetterie/categories" className="btn btn-outline-secondary">
            <i className="fas fa-ticket-alt me-2" aria-hidden="true" />
            Catégories de billets
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
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Catégories d&apos;abonnement</h5>
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
                        <th>Prix</th>
                        <th>Validité</th>
                        <th>Statut</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <tr key={category.id}>
                          <td>
                            <span className="d-flex align-items-center gap-2">
                              {category.color && (
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: 12,
                                    height: 12,
                                    borderRadius: "50%",
                                    background: category.color,
                                  }}
                                  aria-hidden="true"
                                />
                              )}
                              {category.name}
                            </span>
                            {category.description && <div className="text-muted small">{category.description}</div>}
                          </td>
                          <td>{Number(category.price).toFixed(3)} DT</td>
                          <td className="small text-muted">
                            {category.validFrom} → {category.validUntil}
                          </td>
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

          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Abonnés</h5>
            </div>
            <div className="card-body">
              {subscribers.length === 0 ? (
                <p className="text-muted mb-0">Aucun abonnement vendu pour l&apos;instant.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Abonné</th>
                        <th>Catégorie</th>
                        <th>Réf.</th>
                        <th>Statut</th>
                        <th>Dernière validation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map((subscriber) => (
                        <tr key={subscriber.id}>
                          <td>
                            {subscriber.purchaserName}
                            <div className="text-muted small">{subscriber.purchaserEmail}</div>
                          </td>
                          <td>{subscriber.categoryName}</td>
                          <td className="font-monospace small">{subscriber.reference}</td>
                          <td>
                            <span
                              className={`badge ${
                                subscriber.revoked
                                  ? "bg-danger-subtle text-danger"
                                  : subscriber.status === "PAID"
                                    ? "bg-success-subtle text-success"
                                    : "bg-secondary-subtle text-secondary"
                              }`}
                            >
                              {subscriber.revoked ? "Révoqué" : STATUS_LABELS[subscriber.status]}
                            </span>
                          </td>
                          <td className="small text-muted">{subscriber.lastValidatedOn ?? "—"}</td>
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
          placeholder="Ex: Or"
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
        <label htmlFor={`price-${formId}`} className="form-label">
          Prix (DT) <span className="text-danger">*</span>
        </label>
        <input
          id={`price-${formId}`}
          name="price"
          type="number"
          step="0.001"
          min="0"
          className="form-control"
          required
          defaultValue={category?.price}
          disabled={saving}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor={`color-${formId}`} className="form-label">
          Couleur (design)
        </label>
        <input
          id={`color-${formId}`}
          name="color"
          type="color"
          className="form-control form-control-color"
          defaultValue={category?.color ?? "#C9A227"}
          disabled={saving}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor={`validFrom-${formId}`} className="form-label">
          Début de validité <span className="text-danger">*</span>
        </label>
        <input
          id={`validFrom-${formId}`}
          name="validFrom"
          type="date"
          className="form-control"
          required
          defaultValue={category?.validFrom}
          disabled={saving}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor={`validUntil-${formId}`} className="form-label">
          Fin de validité <span className="text-danger">*</span>
        </label>
        <input
          id={`validUntil-${formId}`}
          name="validUntil"
          type="date"
          className="form-control"
          required
          defaultValue={category?.validUntil}
          disabled={saving}
        />
      </div>
      <div className="col-12">
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
