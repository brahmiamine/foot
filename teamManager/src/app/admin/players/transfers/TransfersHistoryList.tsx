import Link from "next/link";

interface TransferRow {
  id: string;
  playerId: string;
  playerNameFr: string;
  playerNumber: number | null;
  direction: "IN" | "OUT";
  otherTeamId: string;
  otherTeamName: string;
  note: string | null;
  transferredAt: string;
}

/**
 * Historique des transferts du club — lecture seule, aucune action possible
 * ici (le transfert lui-même s'effectue depuis superadmin).
 */
export function TransfersHistoryList({ transfers }: { transfers: TransferRow[] }) {
  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h1 className="mb-0">Historique des transferts</h1>
          <Link href="/admin/players" className="btn btn-outline-secondary">
            <i className="fas fa-arrow-left me-2" aria-hidden="true" />
            Retour aux joueurs
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <p className="text-muted small">
            Les transferts sont enregistrés par la fédération (superadmin) — cette page n&apos;affiche que
            l&apos;historique de ce qui concerne votre club.
          </p>
          {transfers.length === 0 ? (
            <p className="text-muted mb-0">Aucun transfert enregistré pour ce club.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Sens</th>
                    <th>Joueur</th>
                    <th>Club</th>
                    <th>Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t.id}>
                      <td className="text-muted small">{new Date(t.transferredAt).toLocaleDateString("fr-FR")}</td>
                      <td>
                        {t.direction === "IN" ? (
                          <span className="badge bg-success-subtle text-success">
                            <i className="bx bx-log-in-circle me-1" aria-hidden="true" />
                            Arrivée
                          </span>
                        ) : (
                          <span className="badge bg-danger-subtle text-danger">
                            <i className="bx bx-log-out-circle me-1" aria-hidden="true" />
                            Départ
                          </span>
                        )}
                      </td>
                      <td>
                        {t.playerNameFr}
                        {t.playerNumber != null && <span className="text-muted"> (n°{t.playerNumber})</span>}
                      </td>
                      <td>{t.direction === "IN" ? `en provenance de ${t.otherTeamName}` : `vers ${t.otherTeamName}`}</td>
                      <td className="text-muted small">{t.note ?? "—"}</td>
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
