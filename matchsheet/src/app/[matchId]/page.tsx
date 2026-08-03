import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchService } from "@/services/MatchService";
import { SheetService } from "@/services/SheetService";
import { LineupService } from "@/services/LineupService";
import { SheetStatusBadge } from "@/components/SheetStatusBadge";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: "À venir",
  IN_PROGRESS: "En cours",
  FINISHED: "Terminé",
  CANCELLED: "Annulé",
};

export default async function MatchOverviewPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;

  const matchService = new MatchService();
  const sheetService = new SheetService();
  const lineupService = new LineupService();

  const match = await matchService.findById(matchId);
  if (!match) {
    notFound();
  }

  const [sheet, lineup] = await Promise.all([sheetService.getOrCreate(matchId), lineupService.findByMatch(matchId)]);

  const homeLineup = lineup.filter((l) => l.teamId === match.equipeHome);
  const awayLineup = lineup.filter((l) => l.teamId === match.equipeAway);

  const renderTeamLineup = (teamName: string, entries: typeof lineup) => {
    const starters = entries.filter((e) => e.role === "STARTER");
    const substitutes = entries.filter((e) => e.role === "SUBSTITUTE");
    return (
      <div className="card h-100">
        <div className="card-header bg-transparent">
          <h5 className="card-title mb-0">{teamName}</h5>
        </div>
        <div className="card-body">
          {entries.length === 0 ? (
            <p className="text-muted mb-0">Composition non renseignée (à faire depuis teamManager).</p>
          ) : (
            <>
              <h6 className="text-uppercase small text-muted fw-semibold">Titulaires ({starters.length}/11)</h6>
              <ul className="list-unstyled mb-3">
                {starters.map((e) => (
                  <li key={e.id} className="d-flex align-items-center gap-2 py-1">
                    <span className="badge bg-light text-dark border" style={{ minWidth: "2rem" }}>
                      {e.shirtNumber ?? "—"}
                    </span>
                    <span>
                      {e.player?.firstNameFr} {e.player?.lastNameFr}
                    </span>
                    {e.isCaptain && <span className="badge bg-warning-subtle text-warning">C</span>}
                    {e.position && <span className="text-muted small ms-auto">{e.position}</span>}
                  </li>
                ))}
              </ul>
              <h6 className="text-uppercase small text-muted fw-semibold">Remplaçants ({substitutes.length})</h6>
              <ul className="list-unstyled mb-0">
                {substitutes.map((e) => (
                  <li key={e.id} className="d-flex align-items-center gap-2 py-1">
                    <span className="badge bg-light text-dark border" style={{ minWidth: "2rem" }}>
                      {e.shirtNumber ?? "—"}
                    </span>
                    <span>
                      {e.player?.firstNameFr} {e.player?.lastNameFr}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid px-0">
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <h2 className="h4 mb-1">
                {match.homeTeam?.nom ?? "?"} <span className="text-muted">vs</span> {match.awayTeam?.nom ?? "?"}
              </h2>
              <p className="text-muted mb-0">
                {match.date
                  ? new Date(match.date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Date non définie"}
                {match.matchday?.number ? ` — Journée ${match.matchday.number}` : ""}
              </p>
            </div>
            <div className="d-flex flex-column align-items-end gap-2">
              <span className="badge bg-info-subtle text-info">{STATUS_LABELS[match.status] ?? match.status}</span>
              <SheetStatusBadge status={sheet.status} />
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2 mt-4">
            <Link href={`/${matchId}/pre-match`} className="btn btn-primary">
              <i className="bx bx-edit-alt me-2" aria-hidden="true" />
              Signatures avant-match
            </Link>
            <Link href={`/${matchId}/live`} className="btn btn-success">
              <i className="bx bx-football me-2" aria-hidden="true" />
              Feuille en direct
            </Link>
            <Link href={`/${matchId}/post-match`} className="btn btn-dark">
              <i className="bx bx-flag me-2" aria-hidden="true" />
              Clôture (signatures après-match)
            </Link>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">{renderTeamLineup(match.homeTeam?.nom ?? "Équipe domicile", homeLineup)}</div>
        <div className="col-12 col-lg-6">{renderTeamLineup(match.awayTeam?.nom ?? "Équipe extérieure", awayLineup)}</div>
      </div>
    </div>
  );
}
