import { getDataSource } from "@/lib/database";
import { PlayerSeasonStat } from "@/entities/PlayerSeasonStat";
import { Player } from "@/entities/Player";

export interface PlayerSeasonRow {
  playerId: string;
  playerName: string;
  appearances: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  yellowCards: number;
  redCards: number;
}

/**
 * Statistiques saison (#22), lues depuis `cms_player_stats` (teamManager) —
 * une ligne par match si le staff saisit au fil de la saison, permettant de
 * dériver les apparitions par COUNT(DISTINCT match_id). Si le club saisit
 * plutôt une ligne agrégée par saison (match_id NULL), les apparitions
 * resteront à 0 pour ces lignes — buts/passes/cartons/minutes restent
 * corrects dans les deux cas puisqu'ils sont sommés.
 */
export class PlayerStatsService {
  async listSeasons(teamId: string): Promise<string[]> {
    const dataSource = await getDataSource();
    const rows = await dataSource
      .getRepository(PlayerSeasonStat)
      .createQueryBuilder("s")
      .select("DISTINCT s.season", "season")
      .where("s.team_id = :teamId", { teamId })
      .andWhere("s.season IS NOT NULL")
      .orderBy("season", "DESC")
      .getRawMany<{ season: string }>();
    return rows.map((r) => r.season);
  }

  async getSeasonStats(teamId: string, season: string): Promise<PlayerSeasonRow[]> {
    const dataSource = await getDataSource();
    const rows = await dataSource
      .getRepository(PlayerSeasonStat)
      .createQueryBuilder("s")
      .select("s.player_id", "playerId")
      .addSelect("COUNT(DISTINCT s.match_id)", "appearances")
      .addSelect("SUM(s.goals)", "goals")
      .addSelect("SUM(s.assists)", "assists")
      .addSelect("SUM(s.minutes_played)", "minutesPlayed")
      .addSelect("SUM(s.yellow_cards)", "yellowCards")
      .addSelect("SUM(s.red_cards)", "redCards")
      .where("s.team_id = :teamId", { teamId })
      .andWhere("s.season = :season", { season })
      .groupBy("s.player_id")
      .orderBy("goals", "DESC")
      .getRawMany<{
        playerId: string;
        appearances: string;
        goals: string;
        assists: string;
        minutesPlayed: string;
        yellowCards: string;
        redCards: string;
      }>();

    if (rows.length === 0) return [];

    const players = await dataSource
      .getRepository(Player)
      .find({ where: rows.map((r) => ({ id: r.playerId })) });
    const nameById = new Map(players.map((p) => [p.id, `${p.firstNameFr} ${p.lastNameFr}`]));

    return rows.map((r) => ({
      playerId: r.playerId,
      playerName: nameById.get(r.playerId) ?? "Joueur",
      appearances: Number(r.appearances),
      goals: Number(r.goals),
      assists: Number(r.assists),
      minutesPlayed: Number(r.minutesPlayed),
      yellowCards: Number(r.yellowCards),
      redCards: Number(r.redCards),
    }));
  }
}
