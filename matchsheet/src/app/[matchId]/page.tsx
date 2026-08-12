import { notFound } from "next/navigation";
import { MatchService } from "@/services/MatchService";
import { SheetService } from "@/services/SheetService";
import { LineupService } from "@/services/LineupService";
import { MatchOfficialService } from "@/services/MatchOfficialService";
import { TeamLineupCard } from "./TeamLineupCard";
import { MatchOverviewHeader } from "./MatchOverviewHeader";
import { serverTranslate } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";



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
  const [unknownPlayer, homeTeamFallback, awayTeamFallback] = await Promise.all([
    serverTranslate("lineup.players.unknown"),
    serverTranslate("teams.home"),
    serverTranslate("teams.away"),
  ]);

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
        nameFr: `${e.player?.firstNameFr ?? ""} ${e.player?.lastNameFr ?? ""}`.trim() || unknownPlayer,
        nameAr: e.player?.firstNameAr && e.player?.lastNameAr ? `${e.player.firstNameAr} ${e.player.lastNameAr}` : null,
      }));

  return (
    <div className="container-fluid px-0">
      <MatchOverviewHeader matchId={matchId} homeTeam={match.homeTeam?.nom ?? "?"} awayTeam={match.awayTeam?.nom ?? "?"} homeTeamAr={match.homeTeam?.nomAr ?? null} awayTeamAr={match.awayTeam?.nomAr ?? null} date={match.date ? new Date(match.date).toISOString() : null} matchday={match.matchday?.number ?? null} status={match.status} sheetStatus={sheet.status} officialsConfirmed={officialsConfirmed} />

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <TeamLineupCard
            teamName={match.homeTeam?.nom ?? homeTeamFallback}
            starters={toEntry(homeLineup, "STARTER")}
            substitutes={toEntry(homeLineup, "SUBSTITUTE")}
            hasComposition={homeLineup.length > 0}
          />
        </div>
        <div className="col-12 col-lg-6">
          <TeamLineupCard
            teamName={match.awayTeam?.nom ?? awayTeamFallback}
            starters={toEntry(awayLineup, "STARTER")}
            substitutes={toEntry(awayLineup, "SUBSTITUTE")}
            hasComposition={awayLineup.length > 0}
          />
        </div>
      </div>
    </div>
  );
}
