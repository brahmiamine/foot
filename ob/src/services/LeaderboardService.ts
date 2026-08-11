import { getDataSource } from "@/lib/database";
import { ObMember } from "@/entities/ObMember";
import { ObPointsLedgerEntry } from "@/entities/ObPointsLedgerEntry";
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
