"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewProduct, approveProduct, publishProduct, rejectProduct } from "./actions";

export interface ModerationProductRow {
  id: string;
  name: string;
  sellerName: string;
  price: number;
  status: string;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface ModerationTableProps {
  products: ModerationProductRow[];
}

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED: "bg-secondary-subtle text-secondary",
  UNDER_REVIEW: "bg-warning-subtle text-warning",
  APPROVED: "bg-info-subtle text-info",
  PUBLISHED: "bg-success-subtle text-success",
  REJECTED: "bg-danger-subtle text-danger",
};

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Soumis",
  UNDER_REVIEW: "En cours de revue",
  APPROVED: "Approuvé",
  PUBLISHED: "Publié",
  REJECTED: "Rejeté",
};

/**
 * Table d'actions de modération (US-08 à US-10). Filtres gérés en amont par
 * page.tsx (formulaire GET classique, pas de JS requis) — ce composant ne
 * porte que les transitions de statut par ligne.
 */
export function ModerationTable({ products }: ModerationTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const runAction = async (id: string, action: () => Promise<{ success: boolean; message?: string; error?: string }>) => {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const result = await action();
      if (result.success) {
        setSuccess(result.message || "Produit mis à jour");
        setRejectingId(null);
        setRejectionReason("");
        startTransition(() => {
          router.refresh();
        });
      } else {
        setError(result.error || "Erreur lors de la modération");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = (id: string) => {
    if (!rejectionReason.trim()) {
      setError("Le motif de rejet est obligatoire");
      return;
    }
    const formData = new FormData();
    formData.set("rejectionReason", rejectionReason);
    void runAction(id, () => rejectProduct(id, formData));
  };

  if (products.length === 0) {
    return <p className="text-muted text-center py-5 mb-0">Aucun produit à modérer pour ces filtres</p>;
  }

  return (
    <>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {success && <div className="alert alert-success py-2">{success}</div>}

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Vendeur</th>
              <th>Prix</th>
              <th>Statut</th>
              <th>Soumis le</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const busy = isPending && busyId === product.id;
              return (
                <Fragment key={product.id}>
                  <tr>
                    <td>{product.name}</td>
                    <td>{product.sellerName}</td>
                    <td>{product.price.toFixed(3)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[product.status] ?? "bg-secondary-subtle text-secondary"}`}>
                        {STATUS_LABEL[product.status] ?? product.status}
                      </span>
                      {product.status === "REJECTED" && product.rejectionReason && (
                        <div className="small text-muted mt-1">Motif : {product.rejectionReason}</div>
                      )}
                    </td>
                    <td className="small text-muted">{new Date(product.createdAt).toLocaleString("fr-TN")}</td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end flex-wrap">
                        {product.status === "SUBMITTED" && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            disabled={busy}
                            onClick={() => runAction(product.id, () => reviewProduct(product.id))}
                          >
                            Mettre en revue
                          </button>
                        )}
                        {product.status === "UNDER_REVIEW" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              disabled={busy}
                              onClick={() => runAction(product.id, () => approveProduct(product.id))}
                            >
                              Approuver
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={busy}
                              onClick={() => {
                                setRejectingId(rejectingId === product.id ? null : product.id);
                                setRejectionReason("");
                                setError(null);
                              }}
                            >
                              Rejeter
                            </button>
                          </>
                        )}
                        {product.status === "APPROVED" && (
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            disabled={busy}
                            onClick={() => runAction(product.id, () => publishProduct(product.id))}
                          >
                            Publier
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {rejectingId === product.id && (
                    <tr>
                      <td colSpan={6}>
                        <div className="d-flex gap-2 align-items-start bg-danger-subtle p-3 rounded">
                          <textarea
                            className="form-control form-control-sm"
                            rows={2}
                            placeholder="Motif du rejet (obligatoire, visible par le vendeur)"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-danger text-nowrap"
                            disabled={busy}
                            onClick={() => handleReject(product.id)}
                          >
                            Confirmer le rejet
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary text-nowrap"
                            onClick={() => setRejectingId(null)}
                          >
                            Annuler
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
