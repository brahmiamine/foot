import { notFound, redirect } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { MatchService } from "@/services/MatchService";
import { PlayerService } from "@/services/PlayerService";
import { MatchEventService } from "@/services/MatchEventService";
import { MatchEventsManagement } from "../../MatchEventsManagement";

export const dynamic = "force-dynamic";

/** Page Événements — journal des buts/cartons/changements d'un match officiel. */
export default async function OfficialMatchEventsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (!can(access, "competitions.view")) {
    redirect("/admin/matches");
  }

  const matchService = new MatchService();
  const match = await matchService.findById(matchId, teamId);
  if (!match) {
    notFound();
  }

  const ref = { matchType: "OFFICIAL" as const, matchId };

  const playerService = new PlayerService();
  const eventService = new MatchEventService();
  const [playersData, eventsData] = await Promise.all([
    playerService.findAll(teamId, access.categories),
    eventService.findForMatch(teamId, "OFFICIAL", matchId),
  ]);

  const players = playersData.filter((p) => p.isActive).map((p) => ({ id: p.id, name: `${p.firstNameFr} ${p.lastNameFr}`, number: p.number ?? null }));

  const events = eventsData.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    teamSide: e.teamSide,
    playerId: e.playerId ?? null,
    playerName: e.player ? `${e.player.firstNameFr} ${e.player.lastNameFr}` : null,
    minute: e.minute ?? null,
    notes: e.notes ?? null,
  }));

  const opponent = match.equipeHome === teamId ? match.awayTeam?.nom : match.homeTeam?.nom;
  const isHome = match.equipeHome === teamId;

  return (
    <MatchEventsManagement
      ref={ref}
      matchLabel={`${isHome ? "Domicile" : "Extérieur"} vs ${opponent ?? "?"}`}
      players={players}
      initialEvents={events}
      canManage={can(access, "competitions.manage")}
      backHref="/admin/matches"
      backLabel="Retour aux matchs"
    />
  );
}
