import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, selectableCategories } from "@/lib/access";
import { FriendlyMatchService } from "@/services/FriendlyMatchService";
import { TeamService } from "@/services/TeamService";
import { StadiumService } from "@/services/StadiumService";
import { AGE_CATEGORIES } from "@/types/categories";
import { FriendlyMatchesManagement } from "./FriendlyMatchesManagement";

export const dynamic = "force-dynamic";

/** Page Matchs amicaux — organisation de matchs hors calendrier officiel. */
export default async function FriendlyMatchesPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();

  const friendlyMatchService = new FriendlyMatchService();
  const teamService = new TeamService();
  const stadiumService = new StadiumService();

  const [matchesData, opponentTeams, stadiumsData] = await Promise.all([
    friendlyMatchService.findAll(teamId, access.categories),
    teamService.findAllClubs(teamId),
    stadiumService.findAll(teamId),
  ]);

  const matches = matchesData.map((m) => ({
    id: m.id,
    category: m.category,
    opponentTeamId: m.opponentTeamId ?? null,
    opponentName: m.opponentTeam?.nom ?? m.opponentName ?? "Adversaire inconnu",
    opponentLogoUrl: m.opponentTeam?.logoUrl ?? m.opponentLogoUrl ?? null,
    isHome: m.isHome,
    stadiumId: m.stadiumId ?? null,
    stadiumName: m.stadium?.nameFr ?? null,
    venueName: m.venueName ?? null,
    date: m.date.toISOString(),
    scoreHome: m.scoreHome ?? null,
    scoreAway: m.scoreAway ?? null,
    status: m.status,
    notes: m.notes ?? null,
  }));

  const teams = opponentTeams.map((t) => ({ id: t.id, nom: t.nom, logoUrl: t.logoUrl ?? null }));
  const stadiums = stadiumsData.map((s) => ({ id: s.id, nameFr: s.nameFr }));

  return (
    <FriendlyMatchesManagement
      initialMatches={matches}
      opponentTeams={teams}
      stadiums={stadiums}
      allowedCategories={selectableCategories(access, AGE_CATEGORIES)}
      canCreate={can(access, "friendlyMatches.create")}
      canEdit={can(access, "friendlyMatches.edit")}
      canDelete={can(access, "friendlyMatches.delete")}
    />
  );
}
