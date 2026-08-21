import { In } from "typeorm";
import { getDataSource } from "@/lib/db";
import { AssignmentResponse } from "@/entities/AssignmentResponse";
import { ReplacementRequest } from "@/entities/ReplacementRequest";
import { AssignmentService } from "./AssignmentService";
import { RefereeConflictDeclarationService } from "./RefereeConflictDeclarationService";
import {
  canAcceptAssignment,
  canRequestReplacement,
  computeAssignmentResponseDeadline,
} from "@/lib/assignmentWorkflowPolicy";
import { canAcceptWithConflictDeclaration } from "@/lib/conflictDeclarationPolicy";

export interface AssignmentWorkflowState {
  response: AssignmentResponse;
  replacementRequest: ReplacementRequest | null;
  acceptanceOverdue: boolean;
}

export class AssignmentWorkflowService {
  private readonly assignments = new AssignmentService();

  private async getOrCreateResponse(userId: string, assignmentId: number): Promise<AssignmentResponse> {
    const assignment = await this.assignments.getMine(userId, assignmentId);
    if (!assignment) throw new Error("Désignation introuvable");

    const ds = await getDataSource();
    const repo = ds.getRepository(AssignmentResponse);
    const existing = await repo.findOne({ where: { assignmentId, userId } });
    if (existing) return existing;

    const responseDeadline = computeAssignmentResponseDeadline(
      assignment.assignedAt,
      assignment.match?.date ?? null,
    );
    await repo
      .createQueryBuilder()
      .insert()
      .values({
        assignmentId,
        userId,
        status: "PENDING_ACCEPTANCE",
        responseDeadline,
        respondedAt: null,
        declineReason: null,
      })
      .orIgnore()
      .execute();
    const created = await repo.findOne({ where: { assignmentId, userId } });
    if (!created) throw new Error("Impossible d'initialiser la réponse à la désignation");
    return created;
  }

  async getState(userId: string, assignmentId: number): Promise<AssignmentWorkflowState> {
    const response = await this.getOrCreateResponse(userId, assignmentId);
    const ds = await getDataSource();
    const replacementRequest = await ds.getRepository(ReplacementRequest).findOne({
      where: {
        assignmentId,
        userId,
        status: In(["PENDING", "APPROVED"]),
      },
      order: { createdAt: "DESC" },
    });
    return {
      response,
      replacementRequest,
      acceptanceOverdue:
        response.status === "PENDING_ACCEPTANCE" && new Date().getTime() > response.responseDeadline.getTime(),
    };
  }

  async accept(userId: string, assignmentId: number): Promise<AssignmentResponse> {
    const assignment = await this.assignments.getMine(userId, assignmentId);
    if (!assignment) throw new Error("Désignation introuvable");
    const response = await this.getOrCreateResponse(userId, assignmentId);
    if (response.status !== "PENDING_ACCEPTANCE") {
      throw new Error("Cette désignation a déjà reçu une réponse");
    }
    const declaration = await new RefereeConflictDeclarationService().getForAssignment(userId, assignmentId);
    const conflictError = canAcceptWithConflictDeclaration(declaration);
    if (conflictError) throw new Error(conflictError);
    if (
      !canAcceptAssignment({
        assignmentActive: assignment.status === "ACTIVE",
        responseDeadline: response.responseDeadline,
        matchDate: assignment.match?.date,
      })
    ) {
      throw new Error("Le délai d'acceptation de cette désignation est dépassé");
    }

    const ds = await getDataSource();
    response.status = "ACCEPTED";
    response.respondedAt = new Date();
    response.declineReason = null;
    return ds.getRepository(AssignmentResponse).save(response);
  }

  async decline(userId: string, assignmentId: number, reason: string): Promise<AssignmentResponse> {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 5) throw new Error("Un motif de refus est obligatoire");
    const assignment = await this.assignments.getMine(userId, assignmentId);
    if (!assignment || assignment.status !== "ACTIVE") {
      throw new Error("Désignation active introuvable");
    }
    if (assignment.match?.date && new Date().getTime() >= assignment.match.date.getTime()) {
      throw new Error("Le match a déjà commencé");
    }
    const response = await this.getOrCreateResponse(userId, assignmentId);
    if (response.status !== "PENDING_ACCEPTANCE") {
      throw new Error("Cette désignation a déjà reçu une réponse");
    }

    const ds = await getDataSource();
    response.status = "DECLINED";
    response.respondedAt = new Date();
    response.declineReason = normalizedReason;
    return ds.getRepository(AssignmentResponse).save(response);
  }

  async requestReplacement(userId: string, assignmentId: number, reason: string): Promise<ReplacementRequest> {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 5) throw new Error("Un motif de remplacement est obligatoire");
    const assignment = await this.assignments.getMine(userId, assignmentId);
    if (!assignment?.match) throw new Error("Désignation introuvable");
    const response = await this.getOrCreateResponse(userId, assignmentId);
    if (
      !canRequestReplacement({
        assignmentActive: assignment.status === "ACTIVE",
        responseStatus: response.status,
        matchDate: assignment.match.date,
      })
    ) {
      throw new Error("Une demande de remplacement nécessite une désignation acceptée et un match à venir");
    }

    const ds = await getDataSource();
    const repo = ds.getRepository(ReplacementRequest);
    const existing = await repo.findOne({
      where: { assignmentId, userId, status: In(["PENDING", "APPROVED"]) },
      order: { createdAt: "DESC" },
    });
    if (existing) throw new Error("Une demande de remplacement est déjà en cours");

    return repo.save(
      repo.create({
        assignmentId,
        matchId: assignment.matchId,
        userId,
        reason: normalizedReason,
        status: "PENDING",
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        replacementAssignmentId: null,
      }),
    );
  }
}
