import { getDataSource } from "@/lib/db";
import { RefereeConflictDeclaration } from "@/entities/RefereeConflictDeclaration";
import { RefereeConfigurationAudit } from "@/entities/RefereeConfigurationAudit";
import { AssignmentService } from "./AssignmentService";

export class ConflictDeclarationError extends Error {}

export interface DeclareConflictInput {
  actorUserId: string;
  actorRole: string;
  hasConflict: boolean;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * REF-005 — déclaration de conflit d'intérêts par désignation, obligatoire
 * avant acceptation (garde dans `AssignmentWorkflowService.accept`).
 * Append-only côté audit : chaque déclaration (initiale ou mise à jour) est
 * journalisée avec avant/après.
 */
export class RefereeConflictDeclarationService {
  async getForAssignment(userId: string, assignmentId: number): Promise<RefereeConflictDeclaration | null> {
    const ds = await getDataSource();
    return ds.getRepository(RefereeConflictDeclaration).findOne({ where: { assignmentId, userId } });
  }

  async declare(assignmentId: number, input: DeclareConflictInput): Promise<RefereeConflictDeclaration> {
    if (input.hasConflict && !input.details?.trim()) {
      throw new ConflictDeclarationError("Le détail du conflit d'intérêts est requis");
    }
    const assignment = await new AssignmentService().getMine(input.actorUserId, assignmentId);
    if (!assignment) throw new ConflictDeclarationError("Désignation introuvable");

    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repo = manager.getRepository(RefereeConflictDeclaration);
      const auditRepo = manager.getRepository(RefereeConfigurationAudit);
      const current = await repo.findOne({ where: { assignmentId, userId: input.actorUserId } });

      const declaredAt = new Date();
      const saved = await repo.save(
        repo.create({
          id: current?.id,
          assignmentId,
          userId: input.actorUserId,
          hasConflict: input.hasConflict,
          details: input.details?.trim().slice(0, 500) || null,
          declaredAt,
        }),
      );

      await auditRepo.save(
        auditRepo.create({
          domain: "REFEREE_CONFLICT_DECLARATION",
          configurationKey: `assignment:${assignmentId}`,
          scopeType: "ASSIGNMENT",
          scopeId: String(assignmentId),
          previousVersion: null,
          newVersion: null,
          before: current ? { hasConflict: current.hasConflict, details: current.details } : null,
          after: { hasConflict: saved.hasConflict, details: saved.details },
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          reason: input.hasConflict
            ? `Conflit d'intérêts déclaré : ${saved.details}`
            : "Déclaration d'absence de conflit d'intérêts",
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        }),
      );

      return saved;
    });
  }
}
