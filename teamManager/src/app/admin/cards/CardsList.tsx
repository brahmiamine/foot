"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteCard } from "./actions";

interface CardData {
  id: string;
  type: string;
  minute: number | null;
  commentFr: string | null;
  isNeutralized: boolean;
  createdAt: string;
  player: { firstNameFr: string; lastNameFr: string; number: number } | null;
  matchLabel: string;
}

const TYPE_LABELS: Record<string, string> = {
  YELLOW: "Jaune",
  RED: "Rouge",
  DOUBLE_YELLOW: "Double jaune",
};

const TYPE_BADGES: Record<string, string> = {
  YELLOW: "bg-warning-subtle text-warning",
  RED: "bg-danger-subtle text-danger",
  DOUBLE_YELLOW: "bg-danger-subtle text-danger",
};

export function CardsList({ initialCards }: { initialCards: CardData[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const cards = initialCards;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce carton ? La suspension et l'amende associées seront aussi supprimées.")) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await deleteCard(id);
      if (result.success) {
        setSuccess(result.message ?? null);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de la suppression");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
        <h1 className="h4 mb-0">Cartons</h1>
        <Link
          href="/admin/cards/create"
          className="btn btn-primary"
        >
          <i className="fas fa-plus me-2" aria-hidden="true" />
          Enregistrer un carton
        </Link>
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

      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">Historique des cartons</h5>
        </div>
        <div className="card-body">
          {cards.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-3">Aucun carton enregistré</p>
              <Link href="/admin/cards/create" className="btn btn-primary">
                Enregistrer le premier carton
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Joueur</th>
                    <th>Match</th>
                    <th>Minute</th>
                    <th>Commentaire</th>
                    <th>Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((c) => (
                    <tr key={c.id} className={c.isNeutralized ? "text-muted" : ""}>
                      <td>
                        <span className={`badge ${TYPE_BADGES[c.type]}`}>
                          {TYPE_LABELS[c.type] ?? c.type}
                        </span>
                        {c.isNeutralized && <span className="badge bg-secondary-subtle text-secondary ms-1">neutralisé</span>}
                      </td>
                      <td>
                        {c.player ? (
                          <>
                            #{c.player.number} {c.player.firstNameFr} {c.player.lastNameFr}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{c.matchLabel}</td>
                      <td>{c.minute ?? "—"}</td>
                      <td>{c.commentFr || <span className="text-muted">-</span>}</td>
                      <td>{new Date(c.createdAt).toLocaleDateString("fr-TN")}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          disabled={loading || isPending}
                          className="btn btn-sm btn-outline-danger"
                        >
                          <i className="fas fa-trash" aria-hidden="true" />
                          <span className="visually-hidden">Supprimer</span>
                        </button>
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
  );
}
