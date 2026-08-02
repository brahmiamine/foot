"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createNote } from "./actions";

interface Option {
  id: string;
  label: string;
}

/** Formulaire de création de note — port de cardManager/components/notes/NoteForm. */
export function NoteForm({ players, matches }: { players: Option[]; matches: Option[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const result = await createNote(formData);
      if (result.success) {
        router.push("/admin/notes");
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
      <h1 className="h4 mb-4">Nouvelle note</h1>
      <div className="card">
        <div className="card-body">
          {error && <div className="alert alert-danger mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="category" className={labelClass}>
                Catégorie
              </label>
              <select id="category" name="category" className={inputClass} required>
                <option value="TACTICAL">Tactique</option>
                <option value="DISCIPLINARY">Disciplinaire</option>
                <option value="MEDICAL">Médicale</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="playerId" className={labelClass}>
                Joueur (optionnel)
              </label>
              <select id="playerId" name="playerId" className={inputClass}>
                <option value="">Aucun</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="matchId" className={labelClass}>
                Match (optionnel)
              </label>
              <select id="matchId" name="matchId" className={inputClass}>
                <option value="">Aucun</option>
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="contentFr" className={labelClass}>
                Contenu
              </label>
              <textarea id="contentFr" name="contentFr" className={inputClass} rows={4} required />
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
                href="/admin/notes"
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
