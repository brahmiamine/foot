import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, requirePermission } from "@/lib/access";
import { TicketingEventService } from "@/services/TicketingEventService";
import { TicketCategoryService } from "@/services/TicketCategoryService";
import { MatchService } from "@/services/MatchService";
import { FriendlyMatchService } from "@/services/FriendlyMatchService";
import { TicketingManagement } from "./TicketingManagement";

export const dynamic = "force-dynamic";

function matchLabelFor(event: Awaited<ReturnType<TicketingEventService["findAll"]>>[number]) {
  if (event.matchType === "FRIENDLY") {
    return `Amical @ ${event.friendlyMatch?.opponentTeam?.nom ?? event.friendlyMatch?.opponentName ?? "Adversaire"} — ${event.friendlyMatch ? new Date(event.friendlyMatch.date).toLocaleDateString("fr-FR") : ""}`;
  }
  return `${event.match?.homeTeam?.nom ?? "?"} vs ${event.match?.awayTeam?.nom ?? "?"} — ${event.match?.date ? new Date(event.match.date).toLocaleDateString("fr-FR") : ""}`;
}

/** Billetterie — liste des billetteries (une par match), création à partir d'un match existant. */
export default async function TicketingPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  requirePermission(access, "ticketing.view");

  const eventService = new TicketingEventService();
  const categoryService = new TicketCategoryService();
  const matchService = new MatchService();
  const friendlyMatchService = new FriendlyMatchService();

  const [eventsData, categoriesData, matchesData, friendlyMatchesData] = await Promise.all([
    eventService.findAll(teamId),
    categoryService.findActive(teamId),
    matchService.findAll(teamId),
    friendlyMatchService.findAll(teamId, "ALL"),
  ]);

  const categoriesByEvent = await Promise.all(eventsData.map(async (e) => ({ eventId: e.id, categories: await eventService.findCategories(e.id) })));
  const categoriesByEventMap = new Map(categoriesByEvent.map((e) => [e.eventId, e.categories]));

  const events = eventsData.map((e) => {
    const cats = categoriesByEventMap.get(e.id) ?? [];
    const totalQuota = cats.reduce((sum, c) => sum + c.quota, 0);
    const totalSold = cats.reduce((sum, c) => sum + c.soldCount, 0);
    return {
      id: e.id,
      matchLabel: matchLabelFor(e),
      status: e.status,
      salesStartAt: e.salesStartAt ? e.salesStartAt.toISOString() : null,
      salesEndAt: e.salesEndAt ? e.salesEndAt.toISOString() : null,
      maxTicketsPerOrder: e.maxTicketsPerOrder,
      totalQuota,
      totalSold,
    };
  });

  const officialMatches = matchesData.map((m) => ({ value: `OFFICIAL:${m.id}`, label: `${m.homeTeam?.nom ?? "?"} vs ${m.awayTeam?.nom ?? "?"} — ${m.date ? new Date(m.date).toLocaleDateString("fr-FR") : ""}` }));
  const friendlyMatches = friendlyMatchesData.map((m) => ({ value: `FRIENDLY:${m.id}`, label: `Amical @ ${m.opponentTeam?.nom ?? m.opponentName ?? "Adversaire"} — ${new Date(m.date).toLocaleDateString("fr-FR")}` }));

  const categories = categoriesData.map((c) => ({ id: c.id, name: c.name, color: c.color ?? null }));

  return (
    <TicketingManagement
      initialEvents={events}
      matchOptions={[...officialMatches, ...friendlyMatches]}
      categories={categories}
      canCreate={can(access, "ticketing.create")}
      canOpen={can(access, "ticketing.open")}
      canClose={can(access, "ticketing.close")}
      canCancel={can(access, "ticketing.cancel")}
      canUpdate={can(access, "ticketing.update")}
    />
  );
}
