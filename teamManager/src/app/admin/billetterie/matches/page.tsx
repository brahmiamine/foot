import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { TicketingService } from "@/services/TicketingService";
import { MatchesTicketingList } from "./MatchesTicketingList";

export const dynamic = "force-dynamic";

/**
 * Liste des matchs à domicile du club, point d'entrée pour configurer la
 * billetterie de chacun (catégories vendues, prix, capacité, règles de
 * vente). Seul le club recevant peut ouvrir la billetterie d'un match — le
 * billet porte toujours `organizerTeamId = matches.equipe_home`, voir
 * README racine § « Billetterie ». Réservé ADMIN.
 */
export default async function BilletterieMatchesPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/admin");

  const teamId = await requireTeamId();
  const service = new TicketingService();
  const matches = await service.listHomeMatches(teamId);

  const items = matches.map((match) => ({
    id: match.id,
    date: match.date ? match.date.toISOString() : null,
    awayTeamName: match.awayTeam?.nom ?? "Adversaire",
    status: match.status,
  }));

  return <MatchesTicketingList matches={items} />;
}
