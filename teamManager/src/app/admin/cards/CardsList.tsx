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
  YELLOW: "bg-amber-100 text-amber-800",
  RED: "bg-red-100 text-red-800",
  DOUBLE_YELLOW: "bg-red-100 text-red-800",
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cartons</h1>
        <Link
          href="/admin/cards/create"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 transition-colors"
        >
          <i className="fas fa-plus mr-2" aria-hidden="true" />
          Enregistrer un carton
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 mb-4 flex justify-between items-start">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="ml-3 text-red-700/70 hover:text-red-700">
            ✕
          </button>
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 text-green-700 px-4 py-3 mb-4 flex justify-between items-start">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Fermer" className="ml-3 text-green-700/70 hover:text-green-700">
            ✕
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold">Historique des cartons</h5>
        </div>
        <div className="p-5">
          {cards.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 mb-3">Aucun carton enregistré</p>
              <Link
                href="/admin/cards/create"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 transition-colors"
              >
                Enregistrer le premier carton
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-gray-500 uppercase text-xs tracking-wide">
                    <th className="p-2">Type</th>
                    <th className="p-2">Joueur</th>
                    <th className="p-2">Match</th>
                    <th className="p-2">Minute</th>
                    <th className="p-2">Commentaire</th>
                    <th className="p-2">Date</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((c) => (
                    <tr key={c.id} className={`border-b border-gray-100 hover:bg-gray-50 ${c.isNeutralized ? "text-gray-400" : ""}`}>
                      <td className="p-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGES[c.type]}`}>
                          {TYPE_LABELS[c.type] ?? c.type}
                        </span>
                        {c.isNeutralized && (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 ml-1">
                            neutralisé
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {c.player ? (
                          <>
                            #{c.player.number} {c.player.firstNameFr} {c.player.lastNameFr}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">{c.matchLabel}</td>
                      <td className="p-3">{c.minute ?? "—"}</td>
                      <td className="p-3">{c.commentFr || <span className="text-gray-400">-</span>}</td>
                      <td className="p-3">{new Date(c.createdAt).toLocaleDateString("fr-TN")}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          disabled={loading || isPending}
                          className="inline-flex items-center justify-center rounded-md border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1 text-sm transition-colors disabled:opacity-60"
                        >
                          <i className="fas fa-trash" aria-hidden="true" />
                          <span className="sr-only">Supprimer</span>
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
