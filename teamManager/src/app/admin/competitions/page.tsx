import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { CompetitionService } from "@/services/CompetitionService";
import { SeasonService } from "@/services/SeasonService";
import { InternalTeamService } from "@/services/InternalTeamService";
import { TeamService } from "@/services/TeamService";
import { CompetitionsManagement } from "./CompetitionsManagement";

export const dynamic = "force-dynamic";

/**
 * Page Compétitions internes — tournois/coupes organisés par le club,
 * distincts du calendrier fédéral partagé (`saisons`/`journees`/`ligues`).
 * Le classement est recalculé à la volée à partir des matchs amicaux
 * rattachés à chaque compétition.
 */
export default async function CompetitionsPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();

  const competitionService = new CompetitionService();
  const seasonService = new SeasonService();
  const internalTeamService = new InternalTeamService();
  const teamService = new TeamService();

  const [competitionsData, seasonsData, squadsData, clubsData] = await Promise.all([
    competitionService.findAll(teamId),
    seasonService.findAll(teamId),
    internalTeamService.findAll(teamId),
    teamService.findAllClubs(teamId),
  ]);

  const competitions = await Promise.all(
    competitionsData.map(async (c) => {
      const participants = await competitionService.findParticipants(c.id);
      const standings = await competitionService.getStandings(c.id);
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        category: c.category ?? null,
        format: c.format,
        status: c.status,
        pointsWin: c.pointsWin,
        pointsDraw: c.pointsDraw,
        pointsLoss: c.pointsLoss,
        seasonId: c.seasonId ?? null,
        seasonName: c.season?.name ?? null,
        startDate: c.startDate ?? null,
        endDate: c.endDate ?? null,
        notes: c.notes ?? null,
        participants: participants.map((p) => ({
          id: p.id,
          name: p.internalTeam?.name ?? p.externalTeam?.nom ?? p.externalName ?? "Participant",
          isInternal: p.internalTeamId != null,
        })),
        standings,
      };
    })
  );

  const seasons = seasonsData.map((s) => ({ id: s.id, name: s.name }));
  const squads = squadsData.map((s) => ({ id: s.id, name: s.name }));
  const clubs = clubsData.map((t) => ({ id: t.id, nom: t.nom }));

  return (
    <CompetitionsManagement
      initialCompetitions={competitions}
      seasons={seasons}
      squads={squads}
      clubs={clubs}
      canManage={can(access, "competitions.manage")}
    />
  );
}
