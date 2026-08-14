import { getDataSource } from "@/lib/db";
import { MatchOfficialAssignment, type MatchOfficialAssignmentRole } from "@/entities/MatchOfficialAssignment";
import { Match } from "@/entities/Match";
import { RefereeUnavailability } from "@/entities/RefereeUnavailability";
import { IsNull } from "typeorm";

export class MatchOfficialAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchOfficialAssignmentError";
  }
}

export interface AssignOfficialInput {
  matchId: string;
  userId: string;
  role: MatchOfficialAssignmentRole;
  refereeId?: string | null;
  assignedBy?: string | null;
}

/**
 * migration.md §11 (Phase 4) : gère qui est réellement affecté à un match
 * en tant qu'officiel — la vérification que consomme
 * [matchId]/layout.tsx avant de laisser un compte REFEREE/MATCH_OFFICIAL/
 * REFEREE_OBSERVER accéder aux routes de ce match.
 */
export class MatchOfficialAssignmentService {
  private async getRepository() {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MatchOfficialAssignment);
  }

  /** Idempotent : ré-affecter le même utilisateur au même rôle sur le même match renvoie l'affectation ACTIVE existante plutôt que d'en dupliquer une. */
  async assign(input: AssignOfficialInput): Promise<MatchOfficialAssignment> {
    const repo = await this.getRepository();
    const existing = await repo.findOne({
      where: { matchId: input.matchId, userId: input.userId, role: input.role, status: "ACTIVE" },
    });
    if (existing) {
      return existing;
    }

    const dataSource = await getDataSource();
    const match = await dataSource.getRepository(Match).findOne({ where: { id: input.matchId } });
    if (!match) throw new MatchOfficialAssignmentError("Match introuvable");
    if (match.date) {
      const matchDate = match.date.toISOString().slice(0, 10);
      const periods = await dataSource.getRepository(RefereeUnavailability).find({
        where: { userId: input.userId, cancelledAt: IsNull() },
      });
      const unavailable = periods.find((period) => period.startDate <= matchDate && period.endDate >= matchDate);
      if (unavailable) {
        throw new MatchOfficialAssignmentError(
          `Cet officiel est indisponible du ${unavailable.startDate} au ${unavailable.endDate}`,
        );
      }
    }

    const assignment = repo.create({
      matchId: input.matchId,
      userId: input.userId,
      role: input.role,
      refereeId: input.refereeId ?? null,
      status: "ACTIVE",
      assignedBy: input.assignedBy ?? null,
    });
    return repo.save(assignment);
  }

  async revoke(assignmentId: number, revokedBy?: string | null): Promise<MatchOfficialAssignment> {
    const repo = await this.getRepository();
    const assignment = await repo.findOne({ where: { id: assignmentId } });
    if (!assignment) {
      throw new MatchOfficialAssignmentError("Affectation introuvable");
    }
    if (assignment.status === "REVOKED") {
      throw new MatchOfficialAssignmentError("Cette affectation est déjà révoquée");
    }
    assignment.status = "REVOKED";
    assignment.revokedBy = revokedBy ?? null;
    assignment.revokedAt = new Date();
    return repo.save(assignment);
  }

  /**
   * Vérité utilisée par [matchId]/layout.tsx (Phase 4) : `null` si
   * l'utilisateur n'a aucune affectation ACTIVE sur ce match — jamais
   * déduit uniquement du rôle porté par le JWT (migration.md §3).
   */
  async findActiveAssignment(userId: string, matchId: string): Promise<MatchOfficialAssignment | null> {
    const repo = await this.getRepository();
    return repo.findOne({ where: { userId, matchId, status: "ACTIVE" } });
  }

  async listForMatch(matchId: string): Promise<MatchOfficialAssignment[]> {
    const repo = await this.getRepository();
    return repo.find({ where: { matchId }, order: { assignedAt: "DESC" } });
  }
}
