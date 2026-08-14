import { getDataSource } from "@/lib/db";
import { Assignment } from "@/entities/Assignment";
import { assignmentBucket, type AssignmentFilter } from "@/lib/assignmentView";

export class AssignmentService {
  private async repository() {
    return (await getDataSource()).getRepository(Assignment);
  }

  private async hydratedQuery(alias = "assignment") {
    return (await this.repository())
      .createQueryBuilder(alias)
      .leftJoinAndSelect(`${alias}.match`, "match")
      .leftJoinAndSelect("match.homeTeam", "homeTeam")
      .leftJoinAndSelect("match.awayTeam", "awayTeam")
      .leftJoinAndSelect("match.matchday", "matchday")
      .leftJoinAndSelect("matchday.season", "season")
      .leftJoinAndSelect("season.league", "league")
      .leftJoinAndSelect(`${alias}.user`, "user")
      .leftJoinAndSelect(`${alias}.referee`, "referee");
  }

  async listMine(userId: string, filter?: AssignmentFilter): Promise<Assignment[]> {
    const assignments = await (await this.hydratedQuery())
      .where("assignment.user_id = :userId", { userId })
      .orderBy("match.date IS NULL", "ASC")
      .addOrderBy("match.date", filter === "past" ? "DESC" : "ASC")
      .addOrderBy("assignment.assigned_at", "DESC")
      .getMany();

    if (!filter) return assignments;
    const now = new Date();
    return assignments.filter((assignment) =>
      assignmentBucket(assignment.status, assignment.match?.status ?? "UPCOMING", assignment.match?.date, now) === filter
    );
  }

  async getMine(userId: string, assignmentId: number): Promise<Assignment | null> {
    return (await this.hydratedQuery())
      .where("assignment.id = :assignmentId", { assignmentId })
      .andWhere("assignment.user_id = :userId", { userId })
      .getOne();
  }

  async listMatchTeam(matchId: string): Promise<Assignment[]> {
    return (await this.hydratedQuery())
      .where("assignment.match_id = :matchId", { matchId })
      .orderBy("assignment.status", "ASC")
      .addOrderBy("assignment.role", "ASC")
      .addOrderBy("assignment.assigned_at", "ASC")
      .getMany();
  }

  async dashboard(userId: string) {
    const all = await this.listMine(userId);
    const now = new Date();
    const upcoming = all.filter((item) => assignmentBucket(item.status, item.match?.status ?? "UPCOMING", item.match?.date, now) === "upcoming");
    const revoked = all.filter((item) => item.status === "REVOKED");
    return {
      next: upcoming[0] ?? null,
      upcomingCount: upcoming.length,
      recentChanges: revoked.filter((item) => item.revokedAt && now.getTime() - item.revokedAt.getTime() <= 7 * 86_400_000).length,
    };
  }

  async history(userId: string): Promise<Assignment[]> {
    const all = await this.listMine(userId);
    return all.sort((left, right) => right.assignedAt.getTime() - left.assignedAt.getTime());
  }
}
