import { getDataSource } from "@/lib/database";
import { ObMember } from "@/entities/ObMember";
import { ObPointsLedgerEntry } from "@/entities/ObPointsLedgerEntry";
import { ObPrediction } from "@/entities/ObPrediction";
import { ObPost } from "@/entities/ObPost";
import { ObComment } from "@/entities/ObComment";
import { CommunityUser } from "@/entities/CommunityUser";

export interface LeaderboardRow {
  userId: string;
  name: string;
  points: number;
}

export class LeaderboardService {
  /** Classement général (#16), pour /classement-supporters. */
  async getTopSupporters(limit = 50): Promise<LeaderboardRow[]> {
    const dataSource = await getDataSource();
    const members = await dataSource
      .getRepository(ObMember)
      .createQueryBuilder("m")
      .where("m.is_blocked = false")
      .orderBy("m.points", "DESC")
      .take(limit)
      .getMany();

    return this.withNames(members.map((m) => ({ userId: m.userId, points: m.points })));
  }

  /** Fan du mois : plus de points cumulés depuis le 1er du mois en cours. */
  async getFanOfTheMonth(): Promise<LeaderboardRow | null> {
    const dataSource = await getDataSource();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const rows = await dataSource
      .getRepository(ObPointsLedgerEntry)
      .createQueryBuilder("l")
      .select("l.user_id", "userId")
      .addSelect("SUM(l.points)", "points")
      .where("l.created_at >= :start", { start: startOfMonth })
      .groupBy("l.user_id")
      .orderBy("points", "DESC")
      .limit(1)
      .getRawMany<{ userId: string; points: string }>();

    if (rows.length === 0) return null;
    const [top] = await this.withNames([{ userId: rows[0].userId, points: Number(rows[0].points) }]);
    return top ?? null;
  }

  /** Fan de la saison : classement général, faute de notion de "saison" dédiée pour l'instant. */
  async getFanOfTheSeason(): Promise<LeaderboardRow | null> {
    const top = await this.getTopSupporters(1);
    return top[0] ?? null;
  }

  /** Années couvertes par le grand livre de points, pour le Hall of Fame (#29). */
  async getAvailableYears(): Promise<number[]> {
    const dataSource = await getDataSource();
    const rows = await dataSource
      .getRepository(ObPointsLedgerEntry)
      .createQueryBuilder("l")
      .select("DISTINCT YEAR(l.created_at)", "year")
      .orderBy("year", "DESC")
      .getRawMany<{ year: number }>();
    return rows.map((r) => Number(r.year));
  }

  /** Top 3 d'une année civile donnée (somme des points gagnés cette année-là). */
  async getSupportersOfYear(year: number, limit = 3): Promise<LeaderboardRow[]> {
    const dataSource = await getDataSource();
    const rows = await dataSource
      .getRepository(ObPointsLedgerEntry)
      .createQueryBuilder("l")
      .select("l.user_id", "userId")
      .addSelect("SUM(l.points)", "points")
      .where("YEAR(l.created_at) = :year", { year })
      .groupBy("l.user_id")
      .orderBy("points", "DESC")
      .limit(limit)
      .getRawMany<{ userId: string; points: string }>();

    return this.withNames(rows.map((r) => ({ userId: r.userId, points: Number(r.points) })));
  }

  /** Meilleur pronostiqueur : le plus de pronostics exacts. */
  async getTopPredictors(limit = 3): Promise<(LeaderboardRow & { exactCount: number })[]> {
    const dataSource = await getDataSource();
    const rows = await dataSource
      .getRepository(ObPrediction)
      .createQueryBuilder("p")
      .select("p.user_id", "userId")
      .addSelect("COUNT(*)", "exactCount")
      .where("p.points_awarded > 0")
      .groupBy("p.user_id")
      .orderBy("exactCount", "DESC")
      .limit(limit)
      .getRawMany<{ userId: string; exactCount: string }>();

    const named = await this.withNames(rows.map((r) => ({ userId: r.userId, points: 0 })));
    const exactByUser = new Map(rows.map((r) => [r.userId, Number(r.exactCount)]));
    return named.map((n) => ({ ...n, exactCount: exactByUser.get(n.userId) ?? 0 }));
  }

  /** Meilleur contributeur : le plus de publications + commentaires. */
  async getTopContributors(limit = 3): Promise<(LeaderboardRow & { contributions: number })[]> {
    const dataSource = await getDataSource();
    const [postCounts, commentCounts] = await Promise.all([
      dataSource
        .getRepository(ObPost)
        .createQueryBuilder("p")
        .select("p.user_id", "userId")
        .addSelect("COUNT(*)", "count")
        .groupBy("p.user_id")
        .getRawMany<{ userId: string; count: string }>(),
      dataSource
        .getRepository(ObComment)
        .createQueryBuilder("c")
        .select("c.user_id", "userId")
        .addSelect("COUNT(*)", "count")
        .groupBy("c.user_id")
        .getRawMany<{ userId: string; count: string }>(),
    ]);

    const totals = new Map<string, number>();
    for (const row of [...postCounts, ...commentCounts]) {
      totals.set(row.userId, (totals.get(row.userId) ?? 0) + Number(row.count));
    }

    const top = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const named = await this.withNames(top.map(([userId]) => ({ userId, points: 0 })));
    const totalByUser = new Map(top);
    return named.map((n) => ({ ...n, contributions: totalByUser.get(n.userId) ?? 0 }));
  }

  /** Supporter historique / le plus fidèle : comptes les plus anciens. */
  async getOldestMembers(limit = 3): Promise<LeaderboardRow[]> {
    const dataSource = await getDataSource();
    const members = await dataSource
      .getRepository(ObMember)
      .createQueryBuilder("m")
      .where("m.is_blocked = false")
      .orderBy("m.created_at", "ASC")
      .take(limit)
      .getMany();

    return this.withNames(members.map((m) => ({ userId: m.userId, points: m.points })));
  }

  private async withNames(rows: { userId: string; points: number }[]): Promise<LeaderboardRow[]> {
    if (rows.length === 0) return [];
    const dataSource = await getDataSource();
    const users = await dataSource.getRepository(CommunityUser).find({
      where: rows.map((r) => ({ id: r.userId })),
    });
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((r) => ({ userId: r.userId, points: r.points, name: nameById.get(r.userId) ?? "Supporter" }));
  }
}
