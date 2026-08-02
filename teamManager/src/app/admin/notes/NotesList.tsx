"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteNote } from "./actions";

interface NoteData {
  id: string;
  contentFr: string;
  category: string;
  createdAt: string;
  author: { name: string } | null;
  player: { firstNameFr: string; lastNameFr: string } | null;
  matchLabel: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  TACTICAL: "Tactique",
  DISCIPLINARY: "Disciplinaire",
  MEDICAL: "Médicale",
  OTHER: "Autre",
};

const CATEGORY_BADGES: Record<string, string> = {
  TACTICAL: "bg-blue-100 text-blue-800",
  DISCIPLINARY: "bg-red-100 text-red-800",
  MEDICAL: "bg-cyan-100 text-cyan-800",
  OTHER: "bg-gray-100 text-gray-800",
};

export function NotesList({ initialNotes }: { initialNotes: NoteData[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const notes = initialNotes;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette note ?")) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await deleteNote(id);
      if (result.success) {
        setSuccess(result.message ?? null);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de la suppression");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
        <Link
          href="/admin/notes/create"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 transition-colors"
        >
          <i className="fas fa-plus mr-2" aria-hidden="true" />
          Nouvelle note
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

      {notes.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 text-center py-10">
          <p className="text-gray-500 mb-0">Aucune note enregistrée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-5" key={n.id}>
              <div className="flex justify-between items-start mb-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_BADGES[n.category]}`}>
                  {CATEGORY_LABELS[n.category] ?? n.category}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(n.id)}
                  disabled={loading || isPending}
                  className="inline-flex items-center justify-center rounded-md border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1 text-sm transition-colors disabled:opacity-60"
                >
                  <i className="fas fa-trash" aria-hidden="true" />
                  <span className="sr-only">Supprimer</span>
                </button>
              </div>
              <p className="mb-2">{n.contentFr}</p>
              <div className="text-xs text-gray-500">
                {n.player && <span>Joueur : {n.player.firstNameFr} {n.player.lastNameFr} — </span>}
                {n.matchLabel && <span>{n.matchLabel} — </span>}
                {n.author?.name && <span>par {n.author.name} — </span>}
                {new Date(n.createdAt).toLocaleDateString("fr-TN")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
