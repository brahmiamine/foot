import { notFound } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, requirePermission } from "@/lib/access";
import { TicketingEventService } from "@/services/TicketingEventService";
import { TicketCategoryService } from "@/services/TicketCategoryService";
import { TicketStatsService } from "@/services/TicketStatsService";
import { TicketingEventDetail } from "./TicketingEventDetail";

export const dynamic = "force-dynamic";

function matchLabelFor(event: NonNullable<Awaited<ReturnType<TicketingEventService["findById"]>>>) {
  if (event.matchType === "FRIENDLY") {
    return `Amical @ ${event.friendlyMatch?.opponentTeam?.nom ?? event.friendlyMatch?.opponentName ?? "Adversaire"} — ${event.friendlyMatch ? new Date(event.friendlyMatch.date).toLocaleDateString("fr-FR") : ""}`;
  }
  return `${event.match?.homeTeam?.nom ?? "?"} vs ${event.match?.awayTeam?.nom ?? "?"} — ${event.match?.date ? new Date(event.match.date).toLocaleDateString("fr-FR") : ""}`;
}

export default async function TicketingEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) notFound();

  const teamId = await requireTeamId();
  const access = await getUserAccess();
  requirePermission(access, "ticketing.view");

  const eventService = new TicketingEventService();
  const event = await eventService.findById(id, teamId);
  if (!event) notFound();

  const [eventCategories, allCategories, stats] = await Promise.all([
    eventService.findCategories(id),
    new TicketCategoryService().findAll(teamId),
    new TicketStatsService().forEvent(id, teamId),
  ]);

  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));

  return (
    <TicketingEventDetail
      event={{
        id: event.id,
        matchLabel: matchLabelFor(event),
        status: event.status,
        salesStartAt: event.salesStartAt ? event.salesStartAt.toISOString() : null,
        salesEndAt: event.salesEndAt ? event.salesEndAt.toISOString() : null,
        maxTicketsPerOrder: event.maxTicketsPerOrder,
      }}
      eventCategories={eventCategories.map((ec) => {
        const cat = categoriesById.get(ec.ticketCategoryId);
        return {
          ticketCategoryId: ec.ticketCategoryId,
          name: cat?.name ?? "?",
          color: cat?.color ?? null,
          quota: ec.quota,
          soldCount: ec.soldCount,
          isAvailable: ec.isAvailable,
        };
      })}
      availableCategories={allCategories
        .filter((c) => !eventCategories.some((ec) => ec.ticketCategoryId === c.id))
        .map((c) => ({ id: c.id, name: c.name, color: c.color ?? null }))}
      stats={stats}
      canManageQuotas={can(access, "ticketing.manageQuotas")}
      canUpdate={can(access, "ticketing.update")}
    />
  );
}
