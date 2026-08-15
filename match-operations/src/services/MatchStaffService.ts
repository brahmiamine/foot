import { getDataSource } from "@/lib/db";
import { Match } from "@/entities/Match";
import { MatchStaffAssignment, MatchStaffRead, type MatchStaffRole } from "@/entities/MatchStaffAssignment";

export class MatchStaffWorkflowError extends Error {
  constructor(message: string) { super(message); this.name = "MatchStaffWorkflowError"; }
}

export class MatchStaffService {
  async list(matchId: string, teamId?: string) {
    const ds = await getDataSource();
    const where = teamId ? { matchId, teamId } : { matchId };
    return ds.getRepository(MatchStaffAssignment).find({ where, order: { role: "ASC", createdAt: "ASC" } });
  }

  async assign(input: { matchId: string; teamId: string; staffId: string; role: MatchStaffRole; assignedBy?: string | null }) {
    const ds = await getDataSource();
    return ds.transaction(async manager => {
      const match = await manager.getRepository(Match).findOne({ where: { id: input.matchId } });
      if (!match) throw new MatchStaffWorkflowError("Match introuvable");
      if (![match.equipeHome, match.equipeAway].includes(input.teamId)) throw new MatchStaffWorkflowError("Le club ne participe pas à ce match");
      const staff = await manager.getRepository(MatchStaffRead).findOne({ where: { id: input.staffId, teamId: input.teamId } });
      if (!staff) throw new MatchStaffWorkflowError("Membre du staff introuvable dans ce club");
      if (input.role === "HEAD_COACH" && !["COACH", "ADJOINT", "PREPARATEUR"].includes(staff.staffType)) {
        throw new MatchStaffWorkflowError("Le responsable technique doit être un entraîneur");
      }
      const repo = manager.getRepository(MatchStaffAssignment);
      if (input.role === "HEAD_COACH") {
        const current = await repo.findOne({ where: { matchId: input.matchId, teamId: input.teamId, role: "HEAD_COACH" } });
        if (current) {
          current.staffId = input.staffId;
          current.assignedBy = input.assignedBy ?? null;
          return repo.save(current);
        }
      }
      const existing = await repo.findOne({ where: { matchId: input.matchId, teamId: input.teamId, staffId: input.staffId, role: input.role } });
      if (existing) return existing;
      return repo.save(repo.create({ ...input, assignedBy: input.assignedBy ?? null }));
    });
  }

  async remove(id: string, teamId: string) {
    const ds = await getDataSource();
    const repo = ds.getRepository(MatchStaffAssignment);
    const item = await repo.findOne({ where: { id, teamId } });
    if (!item) throw new MatchStaffWorkflowError("Affectation staff introuvable");
    await repo.remove(item);
  }
}
