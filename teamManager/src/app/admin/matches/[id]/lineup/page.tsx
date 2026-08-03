import { notFound } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { MatchService } from "@/services/MatchService";
import { PlayerService } from "@/services/PlayerService";
import { MatchLineupService } from "@/services/MatchLineupService";
import { LineupEditor } from "./LineupEditor";

export const dynamic = "force-dynamic";

/** Page Composition — sélection des titulaires/remplaçants pour un match. */
export default async function MatchLineupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;
  const teamId = await requireTeamId();

  const matchService = new MatchService();
  const playerService = new PlayerService();
  const lineupService = new MatchLineupService();

  const match = await matchService.findById(matchId, teamId);
  if (!match) {
    notFound();
  }

  const [playersData, lineupData] = await Promise.all([
    playerService.findAll(teamId),
    lineupService.findByMatch(matchId, teamId),
  ]);

  const players = playersData
    .filter((p) => p.isActive)
    .map((p) => ({
      id: p.id,
      number: p.number,
      name: `${p.firstNameFr} ${p.lastNameFr}`,
      position: p.position ?? null,
    }));

  const lineup = lineupData.map((l) => ({
    playerId: l.playerId,
    role: l.role,
    shirtNumber: l.shirtNumber ?? null,
    position: l.position ?? null,
    isCaptain: l.isCaptain,
  }));

  const opponent = match.equipeHome === teamId ? match.awayTeam?.nom : match.homeTeam?.nom;
  const isHome = match.equipeHome === teamId;

  return (
    <LineupEditor
      matchId={matchId}
      matchLabel={`${isHome ? "Domicile" : "Extérieur"} vs ${opponent ?? "?"}`}
      matchDate={match.date ? match.date.toISOString() : null}
      players={players}
      initialLineup={lineup}
    />
  );
}
