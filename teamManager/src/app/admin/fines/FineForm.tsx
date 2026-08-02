"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createFine } from "./actions";

interface Option {
  id: string;
  label: string;
}

/** Formulaire de création d'amende — port de cardManager/components/fines/FineForm. */
export function FineForm({ players }: { players: Option[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"CARD" | "VIRAGE" | "DIRECTOR" | "DISCIPLINARY">("CARD");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const result = await createFine(formData);
      if (result.success) {
        router.push("/admin/fines");
        router.refresh();
      } else {
        setError(result.error || "Erreur lors de la création");
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
      <h1 className="h4 mb-4">Nouvelle amende</h1>
      <div className="card">
        <div className="card-body">
          {error && <div className="alert alert-danger mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="type" className={labelClass}>
                Type
              </label>
              <select
                id="type"
                name="type"
                className={inputClass}
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                required
              >
                <option value="CARD">Carton</option>
                <option value="VIRAGE">Virage (supporters)</option>
                <option value="DIRECTOR">Dirigeant</option>
                <option value="DISCIPLINARY">Disciplinaire (commission)</option>
              </select>
            </div>

            {type === "CARD" && (
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
            )}

            {type === "DIRECTOR" && (
              <div className="mb-4">
                <label htmlFor="directorNameFr" className={labelClass}>
                  Nom du dirigeant
                </label>
                <input id="directorNameFr" name="directorNameFr" type="text" className={inputClass} required />
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="amount" className={labelClass}>
                Montant (DT)
              </label>
              <input id="amount" name="amount" type="number" step="0.001" min="0.001" className={inputClass} required />
            </div>

            <div className="mb-4">
              <label htmlFor="reasonFr" className={labelClass}>
                Motif
              </label>
              <input id="reasonFr" name="reasonFr" type="text" className={inputClass} required />
            </div>

            <div className="mb-4">
              <label htmlFor="dueDate" className={labelClass}>
                Échéance
              </label>
              <input id="dueDate" name="dueDate" type="date" className={inputClass} />
            </div>

            <div className="d-flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : "Créer"}
              </button>
              <Link
                href="/admin/fines"
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
