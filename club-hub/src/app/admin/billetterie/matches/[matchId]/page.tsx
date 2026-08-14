import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { TicketingService } from "@/services/TicketingService";
import { MatchOffersManagement } from "./MatchOffersManagement";

export const dynamic = "force-dynamic";

export default async function MatchTicketingPage({ params }: { params: Promise<{ matchId: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/admin");

  const { matchId } = await params;
  const teamId = await requireTeamId();
  const service = new TicketingService();

  const match = await service.findHomeMatch(matchId, teamId);
  if (!match) notFound();

  const [categories, offers] = await Promise.all([service.listCategories(teamId), service.listOffers(matchId)]);

  return (
    <MatchOffersManagement
      matchId={matchId}
      matchLabel={`${match.date ? new Date(match.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Date à confirmer"} — vs ${match.awayTeam?.nom ?? "Adversaire"}`}
      categories={categories.map((c) => ({ id: c.id, name: c.name, isActive: c.isActive }))}
      offers={offers.map(({ offer, category, rule }) => ({
        id: offer.id,
        categoryId: category.id,
        categoryName: category.name,
        price: offer.price,
        capacity: offer.capacity,
        soldCount: offer.soldCount,
        allowedAudience: rule?.allowedAudience ?? "PUBLIC",
        maxTicketsPerUser: rule?.maxTicketsPerUser ?? 4,
        startsAt: rule?.startsAt ? rule.startsAt.toISOString() : null,
        endsAt: rule?.endsAt ? rule.endsAt.toISOString() : null,
      }))}
    />
  );
}
