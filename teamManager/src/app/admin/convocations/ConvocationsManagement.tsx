"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { createConvocation, deleteConvocation, updateConvocationResponse } from "./actions";

type ConvocationResponseValue = "PENDING" | "PRESENT" | "ABSENT";

interface ConvocationData {
  id: number;
  response: ConvocationResponseValue;
  notes: string | null;
  createdAt: string;
  matchId: string;
  matchLabel: string;
  matchDate: string | null;
  playerId: string;
  playerLabel: string;
}

interface PlayerOption {
  id: string;
  label: string;
}

interface MatchOption {
  id: string;
  label: string;
}

const RESPONSE_LABELS: Record<ConvocationResponseValue, string> = {
  PENDING: "En attente",
  PRESENT: "Présent",
  ABSENT: "Absent",
};

const RESPONSE_BADGES: Record<ConvocationResponseValue, string> = {
  PENDING: "bg-warning-subtle text-warning",
  PRESENT: "bg-success-subtle text-success",
  ABSENT: "bg-danger-subtle text-danger",
};

interface MatchGroup {
  matchId: string;
  matchLabel: string;
  matchDate: string | null;
  items: ConvocationData[];
}

export function ConvocationsManagement({
  initialConvocations,
  players,
  matches,
}: {
  initialConvocations: ConvocationData[];
  players: PlayerOption[];
  matches: MatchOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const convocations = initialConvocations;
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (selectedPlayerIds.length === 0) {
      setError("Sélectionnez au moins un joueur");
      return;
    }

    setSending(true);
    try {
      const formEl = e.currentTarget;
      const formData = new FormData(formEl);
      selectedPlayerIds.forEach((id) => formData.append("playerIds", id));
      const result = await createConvocation(formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        setShowForm(false);
        setSelectedPlayerIds([]);
        formEl.reset();
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de la convocation");
      }
    } finally {
      setSending(false);
    }
  };

  const handleResponseChange = async (id: number, response: ConvocationResponseValue) => {
    setUpdatingId(id);
    setError(null);
    try {
      const result = await updateConvocationResponse(id, response);
      if (result.success) {
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de la mise à jour");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm("Supprimer cette convocation ?"))) return;
    setDeletingId(id);
    setError(null);
    try {
      const result = await deleteConvocation(id);
      if (result.success) {
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de la suppression");
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Groupe les convocations par match, en conservant l'ordre reçu (les
  // convocations arrivent déjà triées, match le plus récent en premier).
  const grouped: MatchGroup[] = [];
  const matchIndex = new Map<string, number>();
  for (const c of convocations) {
    let idx = matchIndex.get(c.matchId);
    if (idx === undefined) {
      idx = grouped.length;
      matchIndex.set(c.matchId, idx);
      grouped.push({ matchId: c.matchId, matchLabel: c.matchLabel, matchDate: c.matchDate, items: [] });
    }
    grouped[idx].items.push(c);
  }

  const {
    search,
    setSearch,
    page,
    setPage,
    totalPages,
    totalCount,
    items: visibleGroups,
  } = useListFilter(grouped, {
    searchableText: (g) => `${g.matchLabel} ${g.items.map((c) => c.playerLabel).join(" ")}`,
  });

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h4 mb-1">Convocations</h1>
          <p className="text-muted mb-0">Sélectionnez les joueurs convoqués pour un match et suivez leur réponse.</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher un match ou un joueur..." />
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            <i className="fas fa-plus me-2" aria-hidden="true" />
            {showForm ? "Annuler" : "Convoquer des joueurs"}
          </button>
        </div>
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

      {showForm && (
        <div className="card border border-primary mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-primary">Convoquer des joueurs</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-12">
                <label htmlFor="matchId" className="form-label">
                  Match
                </label>
                <select id="matchId" name="matchId" className="form-select" required defaultValue="">
                  <option value="" disabled>
                    Choisir un match
                  </option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Joueurs à convoquer</label>
                <div className="border rounded p-2" style={{ maxHeight: "260px", overflowY: "auto" }}>
                  {players.length === 0 ? (
                    <p className="text-muted mb-0">Aucun joueur actif</p>
                  ) : (
                    players.map((p) => (
                      <div className="form-check" key={p.id}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`player-${p.id}`}
                          checked={selectedPlayerIds.includes(p.id)}
                          onChange={() => togglePlayer(p.id)}
                        />
                        <label className="form-check-label" htmlFor={`player-${p.id}`}>
                          {p.label}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="col-12">
                <label htmlFor="notes" className="form-label">
                  Notes (optionnel)
                </label>
                <textarea id="notes" name="notes" className="form-control" rows={2} maxLength={255} />
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Envoi...
                    </>
                  ) : (
                    "Convoquer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="text-center py-5">
              <p className="text-muted mb-0">Aucune convocation</p>
            </div>
          </div>
        </div>
      ) : totalCount === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted text-center py-5 mb-0">Aucun résultat pour votre recherche</p>
          </div>
        </div>
      ) : (
        visibleGroups.map((g) => (
          <div className="card mb-4" key={g.matchId}>
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="card-title mb-0">{g.matchLabel}</h5>
              {g.matchDate && <span className="text-muted small">{new Date(g.matchDate).toLocaleDateString("fr-TN")}</span>}
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Joueur</th>
                      <th>Statut</th>
                      <th>Notes</th>
                      <th>Réponse</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((c) => (
                      <tr key={c.id}>
                        <td className="fw-medium">{c.playerLabel}</td>
                        <td>
                          <span className={`badge ${RESPONSE_BADGES[c.response]}`}>{RESPONSE_LABELS[c.response]}</span>
                        </td>
                        <td className="text-truncate" style={{ maxWidth: "240px" }}>
                          {c.notes ?? "—"}
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            style={{ width: "150px" }}
                            value={c.response}
                            disabled={updatingId === c.id || isPending}
                            onChange={(e) => handleResponseChange(c.id, e.target.value as ConvocationResponseValue)}
                          >
                            <option value="PENDING">En attente</option>
                            <option value="PRESENT">Présent</option>
                            <option value="ABSENT">Absent</option>
                          </select>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            disabled={deletingId === c.id || isPending}
                            className="btn btn-sm btn-outline-danger"
                          >
                            {deletingId === c.id ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                            ) : (
                              <i className="fas fa-trash" aria-hidden="true" />
                            )}
                            <span className="visually-hidden">Supprimer</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))
      )}
      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={totalCount} />
    </div>
  );
}
