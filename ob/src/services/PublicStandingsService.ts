import { In } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Team } from "@/entities/Team";
import { Match } from "@/entities/Match";

export type StandingsRow = {
  teamId: string;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDiff: number;
  points: number;
};

/**
 * Aucune table "classement" n'existe encore dans le schéma partagé. En
 * attendant, ce classement est calculé à la volée à partir des
 * matchs `FINISHED` enregistrés dans `matches` entre équipes de la même
 * fédération/catégorie/sport que le club — donc seulement aussi complet
 * que les matchs déjà saisis côté ArbiNote/cardManager.
 */
export class PublicStandingsService {
  async getStandings(referenceTeam: Team): Promise<StandingsRow[]> {
    if (!referenceTeam.federationId) return [];

    const ds = await getDataSource();
    const teamRepo = ds.getRepository(Team);
    const matchRepo = ds.getRepository(Match);

    const leagueTeams = await teamRepo.find({
      where: {
        federationId: referenceTeam.federationId,
        sport: referenceTeam.sport,
        ageCategory: referenceTeam.ageCategory,
      },
    });
    if (leagueTeams.length === 0) return [];

    const teamIds = leagueTeams.map((t) => t.id);
    const table = new Map<string, StandingsRow>(
      leagueTeams.map((t) => [
        t.id,
        { teamId: t.id, team: t.nom, played: 0, won: 0, drawn: 0, lost: 0, goalDiff: 0, points: 0 },
      ])
    );

    const matches = await matchRepo.find({
      where: [
        { equipeHome: In(teamIds), status: "FINISHED" },
        { equipeAway: In(teamIds), status: "FINISHED" },
      ],
    });

    for (const m of matches) {
      const home = table.get(m.equipeHome);
      const away = table.get(m.equipeAway);
      if (!home || !away || m.scoreHome == null || m.scoreAway == null) continue;

      home.played++;
      away.played++;
      home.goalDiff += m.scoreHome - m.scoreAway;
      away.goalDiff += m.scoreAway - m.scoreHome;

      if (m.scoreHome > m.scoreAway) {
        home.won++;
        home.points += 3;
        away.lost++;
      } else if (m.scoreHome < m.scoreAway) {
        away.won++;
        away.points += 3;
        home.lost++;
      } else {
        home.drawn++;
        away.drawn++;
        home.points += 1;
        away.points += 1;
      }
    }

    return [...table.values()].sort(
      (a, b) => b.points - a.points || b.goalDiff - a.goalDiff || a.team.localeCompare(b.team)
    );
  }
}
