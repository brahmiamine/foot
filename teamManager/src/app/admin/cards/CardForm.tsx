"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCard } from "./actions";

interface Option {
  id: string;
  label: string;
}

interface CardReasonOption extends Option {
  type: "YELLOW" | "RED" | "BOTH";
}

interface CardFormProps {
  players: Option[];
  matches: Option[];
  cardReasons: CardReasonOption[];
}

/**
 * Formulaire de saisie d'un carton — port de cardManager/components/cards/CardForm.
 */
export function CardForm({ players, matches, cardReasons }: CardFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"YELLOW" | "RED" | "DOUBLE_YELLOW">("YELLOW");

  const needsManualMatches = type === "RED" || type === "DOUBLE_YELLOW";
  const filteredReasons = cardReasons.filter((r) => r.type === "BOTH" || r.type === (type === "YELLOW" ? "YELLOW" : "RED"));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const result = await createCard(formData);
      if (result.success) {
        router.push("/admin/cards");
        router.refresh();
      } else {
        setError(result.error || "Erreur lors de l'enregistrement");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Enregistrer un carton</h1>
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6">
          {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="playerId" className={labelClass}>
                Joueur
              </label>
              <select id="playerId" name="playerId" className={inputClass} required>
                <option value="">Sélectionner un joueur</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="matchId" className={labelClass}>
                Match
              </label>
              <select id="matchId" name="matchId" className={inputClass} required>
                <option value="">Sélectionner un match</option>
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="type" className={labelClass}>
                Type de carton
              </label>
              <select
                id="type"
                name="type"
                className={inputClass}
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                required
              >
                <option value="YELLOW">Jaune</option>
                <option value="RED">Rouge</option>
                <option value="DOUBLE_YELLOW">Double jaune (2e jaune = expulsion)</option>
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="minute" className={labelClass}>
                Minute
              </label>
              <input id="minute" name="minute" type="number" min={1} max={999} className={inputClass} />
            </div>

            <div className="mb-4">
              <label htmlFor="cardReasonId" className={labelClass}>
                Motif
              </label>
              <select id="cardReasonId" name="cardReasonId" className={inputClass}>
                <option value="">Aucun motif prédéfini</option>
                {filteredReasons.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {needsManualMatches && (
              <div className="mb-4">
                <label htmlFor="suspendedMatches" className={labelClass}>
                  Nombre de matchs de suspension (décision de la commission)
                </label>
                <input
                  id="suspendedMatches"
                  name="suspendedMatches"
                  type="number"
                  min={1}
                  max={10}
                  defaultValue={1}
                  className={inputClass}
                  required
                />
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="commentFr" className={labelClass}>
                Commentaire
              </label>
              <textarea id="commentFr" name="commentFr" className={inputClass} rows={2} />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 transition-colors disabled:opacity-60"
              >
                {loading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : "Enregistrer"}
              </button>
              <Link
                href="/admin/cards"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 transition-colors"
              >
                Annuler
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
