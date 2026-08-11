import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { TicketOrderService } from "@/services/TicketOrderService";
import { TicketingEventService } from "@/services/TicketingEventService";
import { OrdersManagement } from "./OrdersManagement";

export const dynamic = "force-dynamic";

/** Commandes de billets — créées côté site public `ob`, consultées ici en lecture. */
export default async function TicketOrdersPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  requirePermission(access, "ticketing.viewOrders");

  const orderService = new TicketOrderService();
  const eventService = new TicketingEventService();

  const [ordersData, eventsData] = await Promise.all([orderService.findAll(teamId), eventService.findAll(teamId)]);

  const eventLabelById = new Map(
    eventsData.map((e) => [
      e.id,
      e.matchType === "FRIENDLY"
        ? `Amical @ ${e.friendlyMatch?.opponentTeam?.nom ?? e.friendlyMatch?.opponentName ?? "Adversaire"}`
        : `${e.match?.homeTeam?.nom ?? "?"} vs ${e.match?.awayTeam?.nom ?? "?"}`,
    ])
  );

  const orders = ordersData.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    eventLabel: eventLabelById.get(o.ticketingEventId) ?? "?",
    customerName: `${o.customerFirstName} ${o.customerLastName}`,
    customerEmail: o.customerEmail,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));

  return <OrdersManagement initialOrders={orders} />;
}
