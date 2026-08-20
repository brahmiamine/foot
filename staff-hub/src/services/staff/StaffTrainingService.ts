import { In } from "typeorm";
import { Player } from "@/entities/Player";
import { Training } from "@/entities/Training";
import { TrainingInvitation, type TrainingInvitationResponse } from "@/entities/TrainingInvitation";
import type { AgeCategory } from "@/types/categories";
import { StaffGovernanceService } from "./StaffGovernanceService";
import { categoryWhere, type CategoryScope } from "./StaffServiceBase";

export class StaffTrainingService extends StaffGovernanceService {
  async listTrainings(teamId: string, categories: CategoryScope): Promise<Training[]> {
    const ds = await this.ds();
    const where = categories === "ALL" ? { teamId } : { teamId, category: categoryWhere(categories) };
    return ds.getRepository(Training).find({ where, order: { date: "DESC" } });
  }

  async createTraining(
    data: Partial<Training> & { teamId: string; category: AgeCategory; title: string; date: Date; createdBy?: string },
  ): Promise<Training> {
    const policy = await this.getTrainingApprovalPolicy(data.teamId);
    const ds = await this.ds();
    const repo = ds.getRepository(Training);
    const { createdBy, ...rest } = data;
    return repo.save(
      repo.create({
        status: "SCHEDULED",
        ...rest,
        planStatus: policy.approvalRequired ? "DRAFT" : "APPROVED",
        submittedBy: null,
        submittedAt: null,
        approvedBy: policy.approvalRequired ? null : (createdBy ?? null),
        approvedAt: policy.approvalRequired ? null : new Date(),
      }),
    );
  }

  /** STAFF-003 — soumet un plan d'entraînement brouillon à l'approbation (aucun effet si la validation n'est pas requise). */
  async submitTrainingPlan(id: number, teamId: string, actorUserId: string): Promise<Training> {
    const ds = await this.ds();
    const repo = ds.getRepository(Training);
    const training = await repo.findOne({ where: { id, teamId } });
    if (!training) throw new Error("Entraînement introuvable");
    if (training.planStatus !== "DRAFT") {
      throw new Error("Seul un plan brouillon peut être soumis à l'approbation");
    }
    training.planStatus = "SUBMITTED";
    training.submittedBy = actorUserId;
    training.submittedAt = new Date();
    return repo.save(training);
  }

  /** STAFF-003 — approuve un plan d'entraînement soumis ; le proposant ne peut pas approuver son propre plan. */
  async approveTrainingPlan(id: number, teamId: string, actorUserId: string): Promise<Training> {
    const ds = await this.ds();
    const repo = ds.getRepository(Training);
    const training = await repo.findOne({ where: { id, teamId } });
    if (!training) throw new Error("Entraînement introuvable");
    if (training.planStatus !== "SUBMITTED") {
      throw new Error("Le plan doit être soumis avant approbation");
    }
    if (training.submittedBy === actorUserId) {
      throw new Error("Le proposant ne peut pas approuver son propre plan d'entraînement");
    }
    training.planStatus = "APPROVED";
    training.approvedBy = actorUserId;
    training.approvedAt = new Date();
    return repo.save(training);
  }

  async cancelTraining(id: number, teamId: string): Promise<void> {
    const ds = await this.ds();
    const repo = ds.getRepository(Training);
    const training = await repo.findOne({ where: { id, teamId } });
    if (!training) return;
    training.status = "CANCELLED";
    await repo.save(training);
  }

  async getInvitationsForTraining(
    trainingId: number,
  ): Promise<Array<{ invitation: TrainingInvitation; player: Player | null }>> {
    const ds = await this.ds();
    const invitations = await ds.getRepository(TrainingInvitation).find({ where: { trainingId } });
    const playerIds = invitations.map((invitation) => invitation.playerId);
    const players = playerIds.length
      ? await ds.getRepository(Player).find({ where: { id: In(playerIds) } })
      : [];
    const byId = new Map(players.map((player) => [player.id, player]));
    return invitations.map((invitation) => ({
      invitation,
      player: byId.get(invitation.playerId) ?? null,
    }));
  }

  async inviteRosterToTraining(trainingId: number, teamId: string): Promise<number> {
    const ds = await this.ds();
    const training = await ds.getRepository(Training).findOne({ where: { id: trainingId, teamId } });
    if (!training) return 0;
    if (training.planStatus !== "APPROVED") {
      throw new Error("Le plan d'entraînement doit être approuvé avant de convoquer l'effectif");
    }

    const roster = await ds.getRepository(Player).find({
      where: { teamId, category: training.category, isActive: true },
    });
    const existing = await ds.getRepository(TrainingInvitation).find({ where: { trainingId } });
    const alreadyInvited = new Set(existing.map((invitation) => invitation.playerId));
    const repo = ds.getRepository(TrainingInvitation);
    const toCreate = roster
      .filter((player) => !alreadyInvited.has(player.id))
      .map((player) =>
        repo.create({
          trainingId,
          playerId: player.id,
          response: "PENDING",
          notifiedAt: new Date(),
        }),
      );

    if (toCreate.length > 0) await repo.save(toCreate);
    return toCreate.length;
  }

  async setAttendance(invitationId: number, response: TrainingInvitationResponse): Promise<void> {
    const ds = await this.ds();
    const repo = ds.getRepository(TrainingInvitation);
    const invitation = await repo.findOne({ where: { id: invitationId } });
    if (!invitation) return;
    invitation.response = response;
    invitation.respondedAt = new Date();
    await repo.save(invitation);
  }

  async getAttendanceReport(
    teamId: string,
    categories: CategoryScope,
  ): Promise<Array<{ player: Player; attended: number; total: number }>> {
    const roster = await this.getRoster(teamId, categories);
    const ds = await this.ds();
    const playerIds = roster.map((player) => player.id);
    if (playerIds.length === 0) return [];

    const invitations = await ds.getRepository(TrainingInvitation).find({
      where: { playerId: In(playerIds) },
    });
    const byPlayer = new Map<string, TrainingInvitation[]>();
    for (const invitation of invitations) {
      if (!byPlayer.has(invitation.playerId)) byPlayer.set(invitation.playerId, []);
      byPlayer.get(invitation.playerId)!.push(invitation);
    }

    return roster.map((player) => {
      const list = byPlayer.get(player.id) ?? [];
      const decided = list.filter((invitation) => invitation.response !== "PENDING");
      const attended = list.filter(
        (invitation) => invitation.response === "PRESENT" || invitation.response === "LATE",
      ).length;
      return { player, attended, total: decided.length };
    });
  }
}
