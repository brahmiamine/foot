import { requireTeamId } from "@/lib/team-context";
import { CardService } from "@/services/CardService";
import { CardsList } from "./CardsList";

export const dynamic = "force-dynamic";

/**
 * Page Cartons — historique des cartons (jaune/rouge/double jaune) du club.
 * Port de cardManager/app/[locale]/admin/dashboard/cards.
 */
export default async function CardsPage() {
  const teamId = await requireTeamId();
  const cardService = new CardService();
  const cardsData = await cardService.findAllByTeam(teamId);

  const cards = cardsData.map((c) => ({
    id: c.id,
    type: c.type,
    minute: c.minute ?? null,
    commentFr: c.commentFr ?? null,
    isNeutralized: c.isNeutralized,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : new Date(c.createdAt).toISOString(),
    player: c.player
      ? { firstNameFr: c.player.firstNameFr, lastNameFr: c.player.lastNameFr, number: c.player.number }
      : null,
    matchLabel: c.match
      ? `J${c.match.matchday?.number ?? "?"} — ${c.match.homeTeam?.nom ?? ""} vs ${c.match.awayTeam?.nom ?? ""}`
      : "—",
  }));

  return <CardsList initialCards={cards} />;
}
