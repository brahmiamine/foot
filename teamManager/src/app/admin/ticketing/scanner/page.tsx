import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { TicketingEventService } from "@/services/TicketingEventService";
import { TicketControllerService } from "@/services/TicketControllerService";
import { ScannerClient } from "./ScannerClient";

export const dynamic = "force-dynamic";

/** Scanner — contrôle d'entrée. Accès réservé (ticketing.scan), pas le reste de l'admin. */
export default async function TicketScannerPage() {
  const session = await auth();
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  requirePermission(access, "ticketing.scan");

  const eventService = new TicketingEventService();
  const eventsData = await eventService.findAll(teamId);
  const scannable = eventsData.filter((e) => e.status === "OPEN" || e.status === "CLOSED");

  const events = scannable.map((e) => ({
    id: e.id,
    status: e.status as "OPEN" | "CLOSED",
    label:
      e.matchType === "FRIENDLY"
        ? `Amical @ ${e.friendlyMatch?.opponentTeam?.nom ?? e.friendlyMatch?.opponentName ?? "Adversaire"}`
        : `${e.match?.homeTeam?.nom ?? "?"} vs ${e.match?.awayTeam?.nom ?? "?"}`,
  }));

  const controllers = await new TicketControllerService().findAll(teamId);
  const myGate = controllers.find((c) => c.userId === session?.user?.id)?.gate ?? null;

  return <ScannerClient events={events} defaultGate={myGate} />;
}
