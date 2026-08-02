"use client";

import { useState, useTransition } from "react";
import { toggleMatchVisibility } from "./actions";

interface MatchData {
  id: string;
  homeTeam: { id: string; nom: string } | null;
  awayTeam: { id: string; nom: string } | null;
  isHome: boolean;
  date: string | null;
  status: "UPCOMING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
  scoreHome: number | null;
  scoreAway: number | null;
  isPublicVisible: boolean;
  galleryCount: number;
}

const statusLabels: Record<MatchData["status"], string> = {
  UPCOMING: "À venir",
  IN_PROGRESS: "En cours",
  FINISHED: "Terminé",
  CANCELLED: "Annulé",
};

/**
 * Matches List Component (lecture seule).
 * Les matchs proviennent de la table partagée `matches` (ArbiNote/cardManager) ;
 * on ne pilote ici que la visibilité publique et le lien vers la galerie.
 */
export function MatchesList({ initialMatches }: { initialMatches: MatchData[] }) {
  const [matches, setMatches] = useState<MatchData[]>(initialMatches);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const onToggle = (match: MatchData) => {
    setError(null);
    startTransition(async () => {
      const result = await toggleMatchVisibility(match.id, !match.isPublicVisible);
      if (!result.success) {
        setError(result.error || "Erreur");
        return;
      }
      setMatches((prev) =>
        prev.map((m) => (m.id === match.id ? { ...m, isPublicVisible: !m.isPublicVisible } : m))
      );
    });
  };

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="card-title mb-3">Matchs</h2>
        <p className="text-muted small">
          Les matchs sont gérés dans cardManager/ArbiNote. Ici, contrôlez uniquement leur visibilité sur le site public.
        </p>
        {error && <div className="alert alert-danger">{error}</div>}
        {matches.length === 0 ? (
          <p className="text-muted">Aucun match trouvé pour ce club.</p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Match</th>
                  <th>Score</th>
                  <th>Statut</th>
                  <th>Galerie</th>
                  <th>Visible sur le site</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr key={match.id}>
                    <td>{formatDate(match.date)}</td>
                    <td>
                      <strong>{match.homeTeam?.nom ?? "?"}</strong> vs <strong>{match.awayTeam?.nom ?? "?"}</strong>
                      {match.isHome ? (
                        <span className="badge bg-secondary ms-2">Domicile</span>
                      ) : (
                        <span className="badge bg-secondary ms-2">Extérieur</span>
                      )}
                    </td>
                    <td>
                      {match.scoreHome !== null && match.scoreAway !== null
                        ? `${match.scoreHome} - ${match.scoreAway}`
                        : "—"}
                    </td>
                    <td>{statusLabels[match.status]}</td>
                    <td>{match.galleryCount > 0 ? `${match.galleryCount} galerie(s)` : "—"}</td>
                    <td>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={match.isPublicVisible}
                          disabled={isPending}
                          onChange={() => onToggle(match)}
                        />
                      </div>
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
