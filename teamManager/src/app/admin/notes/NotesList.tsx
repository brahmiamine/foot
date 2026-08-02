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
  TACTICAL: "bg-primary-subtle text-primary",
  DISCIPLINARY: "bg-danger-subtle text-danger",
  MEDICAL: "bg-info-subtle text-info",
  OTHER: "bg-secondary-subtle text-secondary",
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
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
        <h1 className="h4 mb-0">Notes</h1>
        <Link
          href="/admin/notes/create"
          className="btn btn-primary"
        >
          <i className="fas fa-plus me-2" aria-hidden="true" />
          Nouvelle note
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

      {notes.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-0">Aucune note enregistrée</p>
          </div>
        </div>
      ) : (
        <div className="d-grid gap-3">
          {notes.map((n) => (
            <div className="card" key={n.id}>
              <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className={`badge ${CATEGORY_BADGES[n.category]}`}>
                  {CATEGORY_LABELS[n.category] ?? n.category}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(n.id)}
                  disabled={loading || isPending}
                  className="btn btn-sm btn-outline-danger"
                >
                  <i className="fas fa-trash" aria-hidden="true" />
                  <span className="visually-hidden">Supprimer</span>
                </button>
              </div>
              <p className="mb-2">{n.contentFr}</p>
              <div className="small text-muted">
                {n.player && <span>Joueur : {n.player.firstNameFr} {n.player.lastNameFr} — </span>}
                {n.matchLabel && <span>{n.matchLabel} — </span>}
                {n.author?.name && <span>par {n.author.name} — </span>}
                {new Date(n.createdAt).toLocaleDateString("fr-TN")}
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
