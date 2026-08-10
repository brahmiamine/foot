"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { useListFilter } from "@/hooks/useListFilter";
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
  ACTIVE: "bg-danger-subtle text-danger",
  PURGED: "bg-success-subtle text-success",
  CANCELLED: "bg-secondary-subtle text-secondary",
};

export function SuspensionsList({ initialSuspensions }: { initialSuspensions: SuspensionData[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const suspensions = initialSuspensions;
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    search,
    setSearch,
    page,
    setPage,
    totalPages,
    totalCount,
    items: visibleSuspensions,
  } = useListFilter(suspensions, {
    searchableText: (s) => `${s.player?.firstNameFr ?? ""} ${s.player?.lastNameFr ?? ""} ${REASON_LABELS[s.reason] ?? s.reason}`,
  });

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

  const smallInputClass = "form-control form-control-sm";

  return (
    <div className="container-fluid px-0">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h1 className="h4 mb-0">Suspensions</h1>
        <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher un joueur..." />
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

      <div className="card">
        <div className="card-body">
        {suspensions.length === 0 ? (
          <p className="text-muted text-center py-5 mb-0">Aucune suspension enregistrée</p>
        ) : totalCount === 0 ? (
          <p className="text-muted text-center py-5 mb-0">Aucune suspension ne correspond à votre recherche</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Joueur</th>
                  <th>Motif</th>
                  <th>Matchs</th>
                  <th>Statut</th>
                  <th>Purger / Décision</th>
                </tr>
              </thead>
              <tbody>
                {visibleSuspensions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.player ? (
                        <>
                          #{s.player.number} {s.player.firstNameFr} {s.player.lastNameFr}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{REASON_LABELS[s.reason] ?? s.reason}</td>
                    <td>
                      {s.matchesPurged} / {s.matchesCount}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGES[s.status]}`}>
                        {s.status}
                      </span>
                      {s.hasBlockingFine && s.status !== "ACTIVE" && (
                        <div className="small text-danger mt-1">Amende en retard — reste bloqué</div>
                      )}
                    </td>
                    <td>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handlePurge(s.id, new FormData(e.currentTarget));
                        }}
                        className="row g-2 align-items-end"
                      >
                        <div className="col-12 col-md-auto">
                          <label className="form-label small mb-1">Matchs purgés</label>
                          <input
                            type="number"
                            name="matchesPurged"
                            min={0}
                            max={10}
                            defaultValue={s.matchesPurged}
                            className={`${smallInputClass} skote-input-w-80`}
                            disabled={s.status !== "ACTIVE"}
                          />
                        </div>
                        <div className="col-12 col-md-auto">
                          <label className="form-label small mb-1">Décision</label>
                          <select name="disciplinaryDecision" className="form-select form-select-sm" defaultValue={s.disciplinaryDecision}>
                            <option value="CONFIRMED">Confirmée</option>
                            <option value="MODIFIED">Modifiée</option>
                            <option value="CANCELLED_BY_COMMISSION">Annulée (commission)</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          disabled={loading === s.id || isPending}
                          className="btn btn-sm btn-primary col-12 col-md-auto"
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
            <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={totalCount} />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
