import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchService } from "@/services/MatchService";
import { SheetService } from "@/services/SheetService";
import { LineupService } from "@/services/LineupService";
import { MatchOfficialService } from "@/services/MatchOfficialService";
import { SheetStatusBadge } from "@/components/SheetStatusBadge";
import { TeamLineupCard } from "./TeamLineupCard";

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
  const officialService = new MatchOfficialService();

  const match = await matchService.findById(matchId);
  if (!match) {
    notFound();
  }

  const [sheet, lineup] = await Promise.all([sheetService.getOrCreate(matchId), lineupService.findByMatch(matchId)]);
  const officialsConfirmed = await officialService.areMandatoryRolesConfirmed(sheet.id);

  const homeLineup = lineup.filter((l) => l.teamId === match.equipeHome);
  const awayLineup = lineup.filter((l) => l.teamId === match.equipeAway);

  const toEntry = (entries: typeof lineup, role: "STARTER" | "SUBSTITUTE") =>
    entries
      .filter((e) => e.role === role)
      .map((e) => ({
        id: e.id,
        shirtNumber: e.shirtNumber ?? null,
        isCaptain: e.isCaptain,
        position: e.position ?? null,
        nameFr: `${e.player?.firstNameFr ?? ""} ${e.player?.lastNameFr ?? ""}`.trim() || "Joueur inconnu",
        nameAr: e.player?.firstNameAr && e.player?.lastNameAr ? `${e.player.firstNameAr} ${e.player.lastNameAr}` : null,
      }));

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
            <Link href={`/${matchId}/officials`} className="btn btn-outline-primary">
              <i className="bx bx-id-card me-2" aria-hidden="true" />
              Infos arbitre
              {officialsConfirmed ? (
                <i className="bx bx-check-circle text-success ms-2" aria-hidden="true" />
              ) : (
                <i className="bx bx-error text-warning ms-2" aria-hidden="true" />
              )}
            </Link>
            <Link href={`/${matchId}/controls`} className="btn btn-outline-primary">
              <i className="bx bx-list-check me-2" aria-hidden="true" />
              Contrôles
            </Link>
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
        <div className="col-12 col-lg-6">
          <TeamLineupCard
            teamName={match.homeTeam?.nom ?? "Équipe domicile"}
            starters={toEntry(homeLineup, "STARTER")}
            substitutes={toEntry(homeLineup, "SUBSTITUTE")}
            hasComposition={homeLineup.length > 0}
          />
        </div>
        <div className="col-12 col-lg-6">
          <TeamLineupCard
            teamName={match.awayTeam?.nom ?? "Équipe extérieure"}
            starters={toEntry(awayLineup, "STARTER")}
            substitutes={toEntry(awayLineup, "SUBSTITUTE")}
            hasComposition={awayLineup.length > 0}
          />
        </div>
      </div>
    </div>
  );
}
