"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/hooks/useConfirm";
import { upsertMatchOffer, deleteMatchOffer } from "./actions";

interface CategoryOption {
  id: string;
  name: string;
  isActive: boolean;
}

interface OfferData {
  id: string;
  categoryId: string;
  categoryName: string;
  price: string;
  capacity: number;
  soldCount: number;
  allowedAudience: "PUBLIC" | "HOME_SUPPORTERS" | "AWAY_SUPPORTERS";
  maxTicketsPerUser: number;
  startsAt: string | null;
  endsAt: string | null;
}

const AUDIENCE_LABELS: Record<OfferData["allowedAudience"], string> = {
  PUBLIC: "Public",
  HOME_SUPPORTERS: "Supporters à domicile",
  AWAY_SUPPORTERS: "Supporters visiteurs",
};

// <input type="datetime-local"> attend "YYYY-MM-DDTHH:mm" en heure locale.
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type FormMode = "add" | "edit" | null;

export function MatchOffersManagement({
  matchId,
  matchLabel,
  categories,
  offers,
}: {
  matchId: string;
  matchLabel: string;
  categories: CategoryOption[];
  offers: OfferData[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingOffer, setEditingOffer] = useState<OfferData | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const usedCategoryIds = new Set(offers.map((o) => o.categoryId));
  const availableCategories = categories.filter((c) => c.isActive && !usedCategoryIds.has(c.id));

  const resetForm = () => {
    setFormMode(null);
    setEditingOffer(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await upsertMatchOffer(matchId, formData);
      if (result.success) {
        setSuccess(result.message || "Offre enregistrée avec succès");
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

  const handleDelete = async (offerId: string) => {
    if (!(await confirm("Retirer cette catégorie de la billetterie de ce match ?"))) return;

    setDeletingId(offerId);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteMatchOffer(matchId, offerId);
      if (result.success) {
        setSuccess(result.message || "Offre retirée avec succès");
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
          <Link href="/admin/billetterie/matches" className="text-muted small d-inline-block mb-1">
            &larr; Tous les matchs
          </Link>
          <h1 className="h4 mb-0">Billetterie — {matchLabel}</h1>
        </div>
        {formMode !== "add" && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingOffer(null);
              setFormMode("add");
              setError(null);
              setSuccess(null);
            }}
            disabled={saving || isPending || availableCategories.length === 0}
            title={availableCategories.length === 0 ? "Toutes les catégories actives sont déjà utilisées sur ce match" : undefined}
          >
            <i className="fas fa-plus me-2" aria-hidden="true" />
            Ajouter une catégorie
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

      {formMode === "add" && (
        <div className="card border border-success mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-success">Ajouter une catégorie à ce match</h5>
            <button type="button" onClick={resetForm} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <OfferForm
              formId="add"
              saving={saving}
              onSubmit={handleSubmit}
              onCancel={resetForm}
              categoryOptions={availableCategories}
            />
          </div>
        </div>
      )}

      <div className="row">
        <div className={`col-12 ${formMode === "edit" ? "col-lg-7" : "col-lg-12"}`}>
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Catégories ouvertes à la vente</h5>
            </div>
            <div className="card-body">
              {offers.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-0">
                    Aucune catégorie de billet n&rsquo;est encore configurée pour ce match.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Catégorie</th>
                        <th>Prix</th>
                        <th>Vendus / Capacité</th>
                        <th>Audience</th>
                        <th>Fenêtre de vente</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offers.map((offer) => (
                        <tr key={offer.id}>
                          <td>{offer.categoryName}</td>
                          <td>{Number(offer.price).toFixed(3)} DT</td>
                          <td>
                            {offer.soldCount} / {offer.capacity}
                          </td>
                          <td>
                            {AUDIENCE_LABELS[offer.allowedAudience]}
                            {offer.allowedAudience !== "PUBLIC" && (
                              <div className="text-muted small">Auto-déclaration acheteur, non vérifiée</div>
                            )}
                          </td>
                          <td className="small text-muted">
                            {offer.startsAt ? new Date(offer.startsAt).toLocaleString("fr-FR") : "Ouverte"}
                            {" → "}
                            {offer.endsAt ? new Date(offer.endsAt).toLocaleString("fr-FR") : "Sans limite"}
                          </td>
                          <td className="text-end">
                            <div className="btn-group" role="group">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => {
                                  setEditingOffer(offer);
                                  setFormMode("edit");
                                  setError(null);
                                  setSuccess(null);
                                }}
                                disabled={saving || isPending}
                              >
                                <i className="fas fa-edit" aria-hidden="true" />
                                <span className="visually-hidden">Modifier</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(offer.id)}
                                disabled={deletingId === offer.id || isPending || offer.soldCount > 0}
                                title={offer.soldCount > 0 ? "Des billets ont déjà été vendus" : undefined}
                              >
                                {deletingId === offer.id ? (
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

        {formMode === "edit" && editingOffer && (
          <div className="col-12 col-lg-5 mt-4 mt-lg-0">
            <div className="card border border-primary">
              <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 text-primary">Modifier — {editingOffer.categoryName}</h5>
                <button type="button" className="btn-close" onClick={resetForm} aria-label="Fermer" />
              </div>
              <div className="card-body">
                <OfferForm
                  formId="edit"
                  saving={saving}
                  onSubmit={handleSubmit}
                  onCancel={resetForm}
                  categoryOptions={categories}
                  offer={editingOffer}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OfferForm({
  formId,
  saving,
  onSubmit,
  onCancel,
  categoryOptions,
  offer,
}: {
  formId: string;
  saving: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  categoryOptions: CategoryOption[];
  offer?: OfferData;
}) {
  return (
    <form onSubmit={onSubmit} className="row g-3" key={offer?.id ?? "new"}>
      <div className="col-12">
        <label htmlFor={`categoryId-${formId}`} className="form-label">
          Catégorie <span className="text-danger">*</span>
        </label>
        {offer ? (
          <>
            <input type="text" className="form-control" value={offer.categoryName} disabled readOnly />
            <input type="hidden" name="categoryId" value={offer.categoryId} />
          </>
        ) : (
          <select id={`categoryId-${formId}`} name="categoryId" className="form-select" required disabled={saving}>
            <option value="">Choisir…</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
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
          defaultValue={offer?.price}
          disabled={saving}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor={`capacity-${formId}`} className="form-label">
          Capacité <span className="text-danger">*</span>
        </label>
        <input
          id={`capacity-${formId}`}
          name="capacity"
          type="number"
          min={offer ? offer.soldCount || 1 : 1}
          className="form-control"
          required
          defaultValue={offer?.capacity}
          disabled={saving}
        />
        {offer && offer.soldCount > 0 && (
          <div className="form-text">{offer.soldCount} billet(s) déjà vendu(s) — capacité minimale.</div>
        )}
      </div>
      <div className="col-md-6">
        <label htmlFor={`allowedAudience-${formId}`} className="form-label">
          Audience
        </label>
        <select
          id={`allowedAudience-${formId}`}
          name="allowedAudience"
          className="form-select"
          defaultValue={offer?.allowedAudience ?? "PUBLIC"}
          disabled={saving}
        >
          <option value="PUBLIC">Public</option>
          <option value="HOME_SUPPORTERS">Supporters à domicile</option>
          <option value="AWAY_SUPPORTERS">Supporters visiteurs</option>
        </select>
        <div className="form-text">
          Les catégories réservées reposent sur une auto-déclaration de l&rsquo;acheteur à l&rsquo;achat, pas une
          vérification d&rsquo;identité — voir le README de <code>billetterie</code>.
        </div>
      </div>
      <div className="col-md-6">
        <label htmlFor={`maxTicketsPerUser-${formId}`} className="form-label">
          Quota par acheteur
        </label>
        <input
          id={`maxTicketsPerUser-${formId}`}
          name="maxTicketsPerUser"
          type="number"
          min={1}
          className="form-control"
          defaultValue={offer?.maxTicketsPerUser ?? 4}
          disabled={saving}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor={`startsAt-${formId}`} className="form-label">
          Ouverture des ventes
        </label>
        <input
          id={`startsAt-${formId}`}
          name="startsAt"
          type="datetime-local"
          className="form-control"
          defaultValue={toDatetimeLocal(offer?.startsAt ?? null)}
          disabled={saving}
        />
        <div className="form-text">Laisser vide pour une vente ouverte immédiatement.</div>
      </div>
      <div className="col-md-6">
        <label htmlFor={`endsAt-${formId}`} className="form-label">
          Fermeture des ventes
        </label>
        <input
          id={`endsAt-${formId}`}
          name="endsAt"
          type="datetime-local"
          className="form-control"
          defaultValue={toDatetimeLocal(offer?.endsAt ?? null)}
          disabled={saving}
        />
        <div className="form-text">Laisser vide pour aucune limite.</div>
      </div>
      <div className="col-12 d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              Enregistrement...
            </>
          ) : offer ? (
            "Enregistrer"
          ) : (
            "Ajouter"
          )}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Annuler
        </button>
      </div>
    </form>
  );
}
