import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompetitionAdminPageSession } from "@/lib/adminAuth";
import { listRefereeReplacementRequests } from "@/lib/refereeReplacementRequests";
import {
  approveReplacementRequestAction,
  rejectReplacementRequestAction,
  resolveReplacementRequestAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function RefereeReplacementRequestsPage() {
  const session = await getCompetitionAdminPageSession();
  if (!session) redirect("/admin/login");
  const requests = await listRefereeReplacementRequests(session);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-4 flex-wrap">
        <div>
          <h1 className="h3 mb-1">Demandes de remplacement des officiels</h1>
          <p className="text-muted mb-0">
            La revue n&apos;effectue jamais la réaffectation automatiquement. Créez d&apos;abord la nouvelle désignation puis rattachez son identifiant pour clôturer la demande.
          </p>
        </div>
        <Link className="btn btn-outline-primary" href="/admin/matches">Gestion des matchs</Link>
      </div>

      {requests.length === 0 ? (
        <div className="alert alert-light border">Aucune demande dans votre périmètre.</div>
      ) : (
        <div className="table-responsive border rounded bg-white">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Match</th>
                <th>Officiel</th>
                <th>Motif</th>
                <th>Statut</th>
                <th>Créée le</th>
                <th style={{ minWidth: 340 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <strong>{request.homeName ?? "Équipe domicile"} — {request.awayName ?? "Équipe extérieure"}</strong>
                    <div className="small text-muted">{request.matchDate ? request.matchDate.toLocaleString("fr-FR") : "Date non définie"}</div>
                    <code className="small">{request.matchId}</code>
                  </td>
                  <td>
                    <div>{request.refereeName ?? request.userId}</div>
                    <div className="small text-muted">Désignation #{request.assignmentId}</div>
                  </td>
                  <td style={{ maxWidth: 360, whiteSpace: "normal" }}>{request.reason}</td>
                  <td>
                    <span className={`badge ${request.status === "PENDING" ? "text-bg-warning" : request.status === "APPROVED" ? "text-bg-info" : request.status === "RESOLVED" ? "text-bg-success" : "text-bg-secondary"}`}>
                      {request.status}
                    </span>
                    {request.reviewNote && <div className="small text-muted mt-1">{request.reviewNote}</div>}
                  </td>
                  <td>{request.createdAt.toLocaleString("fr-FR")}</td>
                  <td>
                    {request.status === "PENDING" && (
                      <div className="d-grid gap-2">
                        <form action={approveReplacementRequestAction.bind(null, request.id)} className="d-flex gap-2">
                          <input className="form-control form-control-sm" name="note" maxLength={500} placeholder="Note de revue (optionnelle)" />
                          <button className="btn btn-success btn-sm" type="submit">Approuver</button>
                        </form>
                        <form action={rejectReplacementRequestAction.bind(null, request.id)} className="d-flex gap-2">
                          <input className="form-control form-control-sm" name="note" minLength={3} maxLength={500} required placeholder="Motif du rejet" />
                          <button className="btn btn-outline-danger btn-sm" type="submit">Refuser</button>
                        </form>
                      </div>
                    )}
                    {request.status === "APPROVED" && (
                      <form action={resolveReplacementRequestAction.bind(null, request.id)} className="d-flex gap-2">
                        <input
                          className="form-control form-control-sm"
                          name="replacementAssignmentId"
                          type="number"
                          min={1}
                          required
                          placeholder="Nouvel assignment ID"
                        />
                        <button className="btn btn-primary btn-sm" type="submit">Clôturer</button>
                      </form>
                    )}
                    {(request.status === "REJECTED" || request.status === "RESOLVED") && (
                      <span className="small text-muted">
                        {request.status === "RESOLVED" && request.replacementAssignmentId
                          ? `Nouvelle désignation #${request.replacementAssignmentId}`
                          : "Aucune action requise"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
