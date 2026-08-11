import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, requirePermission } from "@/lib/access";
import { TicketService } from "@/services/TicketService";
import { TicketingEventService } from "@/services/TicketingEventService";
import { TicketCategoryService } from "@/services/TicketCategoryService";
import { TicketsManagement } from "./TicketsManagement";

export const dynamic = "force-dynamic";

/** Recherche et gestion des billets individuels (annulation). */
export default async function TicketsPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  requirePermission(access, "ticketing.manageTickets");

  const ticketService = new TicketService();
  const eventService = new TicketingEventService();
  const categoryService = new TicketCategoryService();

  const [ticketsData, eventsData, categoriesData] = await Promise.all([
    ticketService.findAll(teamId),
    eventService.findAll(teamId),
    categoryService.findAll(teamId),
  ]);

  const eventLabelById = new Map(
    eventsData.map((e) => [
      e.id,
      e.matchType === "FRIENDLY"
        ? `Amical @ ${e.friendlyMatch?.opponentTeam?.nom ?? e.friendlyMatch?.opponentName ?? "Adversaire"}`
        : `${e.match?.homeTeam?.nom ?? "?"} vs ${e.match?.awayTeam?.nom ?? "?"}`,
    ])
  );
  const categoryNameById = new Map(categoriesData.map((c) => [c.id, c.name]));

  const tickets = ticketsData.map((t) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    eventLabel: eventLabelById.get(t.ticketingEventId) ?? "?",
    categoryName: categoryNameById.get(t.ticketCategoryId) ?? "?",
    holderName: [t.holderFirstName, t.holderLastName].filter(Boolean).join(" ") || "—",
    status: t.status,
    issuedAt: t.issuedAt ? t.issuedAt.toISOString() : null,
    usedAt: t.usedAt ? t.usedAt.toISOString() : null,
  }));

  return <TicketsManagement initialTickets={tickets} canCancel={can(access, "ticketing.cancelTicket")} />;
}
