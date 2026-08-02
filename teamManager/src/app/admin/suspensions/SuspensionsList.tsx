"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSuspension } from "./actions";

interface SuspensionData {
  id: string;
  reason: string;
  matchesCount: number;
  matchesPurged: number;
  status: "ACTIVE" | "PURGED" | "CANCELLED";
  disciplinaryDecision: string;
  overrideMatchesCount: number | null;
  createdAt: string;
  player: { firstNameFr: string; lastNameFr: string; number: number } | null;
  hasBlockingFine: boolean;
}

const REASON_LABELS: Record<string, string> = {
  THREE_YELLOWS: "3 jaunes cumulés",
  CONSECUTIVE_YELLOWS: "Jaunes consécutifs",
  RED_CARD_1: "Rouge (1 match)",
  RED_CARD_2: "Rouge (2 matchs)",
  RED_CARD_3: "Rouge (3 matchs)",
};

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: "bg-red-100 text-red-800",
  PURGED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export function SuspensionsList({ initialSuspensions }: { initialSuspensions: SuspensionData[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const suspensions = initialSuspensions;
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePurge = async (id: string, formData: FormData) => {
    setLoading(id);
    setError(null);
    setSuccess(null);
    try {
      const result = await updateSuspension(id, formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de la mise à jour");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(null);
    }
  };

  const smallInputClass = "rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-60";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Suspensions</h1>

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

      <div className="bg-white rounded-lg shadow border border-gray-200 p-5">
        {suspensions.length === 0 ? (
          <p className="text-gray-500 text-center py-10 mb-0">Aucune suspension enregistrée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 text-gray-500 uppercase text-xs tracking-wide">
                  <th className="p-2">Joueur</th>
                  <th className="p-2">Motif</th>
                  <th className="p-2">Matchs</th>
                  <th className="p-2">Statut</th>
                  <th className="p-2">Purger / Décision</th>
                </tr>
              </thead>
              <tbody>
                {suspensions.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 align-middle">
                    <td className="p-3">
                      {s.player ? (
                        <>
                          #{s.player.number} {s.player.firstNameFr} {s.player.lastNameFr}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">{REASON_LABELS[s.reason] ?? s.reason}</td>
                    <td className="p-3">
                      {s.matchesPurged} / {s.matchesCount}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGES[s.status]}`}>
                        {s.status}
                      </span>
                      {s.hasBlockingFine && s.status !== "ACTIVE" && (
                        <div className="text-xs text-red-600 mt-1">Amende en retard — reste bloqué</div>
                      )}
                    </td>
                    <td className="p-3">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handlePurge(s.id, new FormData(e.currentTarget));
                        }}
                        className="flex items-end gap-2 flex-wrap"
                      >
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Matchs purgés</label>
                          <input
                            type="number"
                            name="matchesPurged"
                            min={0}
                            max={10}
                            defaultValue={s.matchesPurged}
                            className={smallInputClass}
                            style={{ width: "80px" }}
                            disabled={s.status !== "ACTIVE"}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Décision</label>
                          <select name="disciplinaryDecision" className={smallInputClass} defaultValue={s.disciplinaryDecision}>
                            <option value="CONFIRMED">Confirmée</option>
                            <option value="MODIFIED">Modifiée</option>
                            <option value="CANCELLED_BY_COMMISSION">Annulée (commission)</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          disabled={loading === s.id || isPending}
                          className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 transition-colors disabled:opacity-60"
                        >
                          {loading === s.id ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                          ) : (
                            "Mettre à jour"
                          )}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
