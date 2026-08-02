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

  const inputClass = "form-control";
  const labelClass = "form-label";

  return (
    <div className="container-fluid px-0 skote-form-narrow">
      <h1 className="h4 mb-4">Enregistrer un carton</h1>
      <div className="card">
        <div className="card-body">
          {error && <div className="alert alert-danger mb-4">{error}</div>}
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

            <div className="d-flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : "Enregistrer"}
              </button>
              <Link
                href="/admin/cards"
                className="btn btn-outline-secondary"
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
