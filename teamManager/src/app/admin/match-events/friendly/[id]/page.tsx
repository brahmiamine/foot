import { notFound, redirect } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, categoryAllowed } from "@/lib/access";
import { FriendlyMatchService } from "@/services/FriendlyMatchService";
import { PlayerService } from "@/services/PlayerService";
import { MatchEventService } from "@/services/MatchEventService";
import { MatchEventsManagement } from "../../MatchEventsManagement";

export const dynamic = "force-dynamic";

/** Page Événements — journal des buts/cartons/changements d'un match amical. */
export default async function FriendlyMatchEventsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (isNaN(id)) notFound();

  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (!can(access, "competitions.view")) {
    redirect("/admin/friendly-matches");
  }

  const friendlyMatchService = new FriendlyMatchService();
  const match = await friendlyMatchService.findById(id, teamId);
  if (!match || !categoryAllowed(access, match.category)) {
    notFound();
  }

  const ref = { matchType: "FRIENDLY" as const, friendlyMatchId: id };

  const playerService = new PlayerService();
  const eventService = new MatchEventService();
  const [playersData, eventsData] = await Promise.all([
    playerService.findAll(teamId, access.categories),
    eventService.findForMatch(teamId, "FRIENDLY", id),
  ]);

  const players = playersData
    .filter((p) => p.isActive && p.category === match.category)
    .map((p) => ({ id: p.id, name: `${p.firstNameFr} ${p.lastNameFr}`, number: p.number ?? null }));

  const events = eventsData.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    teamSide: e.teamSide,
    playerId: e.playerId ?? null,
    playerName: e.player ? `${e.player.firstNameFr} ${e.player.lastNameFr}` : null,
    minute: e.minute ?? null,
    notes: e.notes ?? null,
  }));

  const opponentName = match.opponentTeam?.nom ?? match.opponentName ?? "Adversaire";

  return (
    <MatchEventsManagement
      ref={ref}
      matchLabel={`${match.isHome ? "Domicile" : "Extérieur"} vs ${opponentName} (amical)`}
      players={players}
      initialEvents={events}
      canManage={can(access, "competitions.manage")}
      backHref="/admin/friendly-matches"
      backLabel="Retour aux matchs amicaux"
    />
  );
}
