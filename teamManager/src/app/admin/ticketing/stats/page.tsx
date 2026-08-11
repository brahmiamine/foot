import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { TicketingEventService } from "@/services/TicketingEventService";
import { TicketStatsService } from "@/services/TicketStatsService";
import { StatsClient } from "./StatsClient";

export const dynamic = "force-dynamic";

/** Tableau de bord billetterie — comptages calculés côté serveur (jamais côté client). */
export default async function TicketingStatsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event: eventParam } = await searchParams;
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  requirePermission(access, "ticketing.viewStats");

  const eventService = new TicketingEventService();
  const eventsData = await eventService.findAll(teamId);

  const events = eventsData.map((e) => ({
    id: e.id,
    label:
      e.matchType === "FRIENDLY"
        ? `Amical @ ${e.friendlyMatch?.opponentTeam?.nom ?? e.friendlyMatch?.opponentName ?? "Adversaire"}`
        : `${e.match?.homeTeam?.nom ?? "?"} vs ${e.match?.awayTeam?.nom ?? "?"}`,
  }));

  const selectedId = eventParam ? parseInt(eventParam, 10) : events[0]?.id;
  const stats = selectedId ? await new TicketStatsService().forEvent(selectedId, teamId) : null;

  return <StatsClient events={events} selectedId={selectedId ?? null} stats={stats} />;
}
