"use client";

import Link from "next/link";

interface MatchItem {
  id: string;
  date: string | null;
  awayTeamName: string;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: "À venir",
  IN_PROGRESS: "En cours",
  FINISHED: "Terminé",
  CANCELLED: "Annulé",
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "Date à confirmer";
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchesTicketingList({ matches }: { matches: MatchItem[] }) {
  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h4 mb-1">Billetterie par match</h1>
          <p className="text-muted mb-0">
            Matchs où le club reçoit — sélectionnez-en un pour ouvrir la vente de billets (catégories, prix, capacité,
            règles de vente).
          </p>
        </div>
        <Link href="/admin/billetterie/categories" className="btn btn-outline-secondary">
          <i className="fas fa-tags me-2" aria-hidden="true" />
          Catégories de billets
        </Link>
      </div>

      <div className="card">
        <div className="card-body">
          {matches.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-0">Aucun match à domicile trouvé pour ce club.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Adversaire</th>
                    <th>Statut</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr key={match.id}>
                      <td>{formatDate(match.date)}</td>
                      <td>vs {match.awayTeamName}</td>
                      <td>
                        <span className="badge bg-light text-dark">{STATUS_LABELS[match.status] ?? match.status}</span>
                      </td>
                      <td className="text-end">
                        <Link href={`/admin/billetterie/matches/${match.id}`} className="btn btn-sm btn-outline-primary">
                          <i className="fas fa-ticket me-1" aria-hidden="true" />
                          Configurer la billetterie
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
