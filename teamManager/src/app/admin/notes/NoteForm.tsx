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

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nouvelle note</h1>
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6">
          {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 mb-4">{error}</div>}
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

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 transition-colors disabled:opacity-60"
              >
                {loading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : "Créer"}
              </button>
              <Link
                href="/admin/notes"
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
