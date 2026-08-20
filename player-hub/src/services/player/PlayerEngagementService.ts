import { In } from "typeorm";
import { Convocation, type ConvocationResponse } from "@/entities/Convocation";
import { Training } from "@/entities/Training";
import {
  TrainingInvitation,
  type TrainingRsvpStatus,
} from "@/entities/TrainingInvitation";
import { PlayerMatchService } from "./PlayerMatchService";

export class PlayerEngagementService extends PlayerMatchService {
  async getConvocations(playerId: string): Promise<Convocation[]> {
    const ds = await this.ds();
    return ds.getRepository(Convocation).find({
      where: { playerId },
      order: { createdAt: "DESC" },
    });
  }

  async respondToConvocation(
    playerId: string,
    convocationId: number,
    response: Exclude<ConvocationResponse, "PENDING">,
  ): Promise<{ success: boolean; error?: string }> {
    const ds = await this.ds();
    const repo = ds.getRepository(Convocation);
    const convocation = await repo.findOne({ where: { id: convocationId, playerId } });
    if (!convocation) return { success: false, error: "not_found" };
    if (convocation.cancelledAt) return { success: false, error: "cancelled" };

    convocation.response = response;
    convocation.respondedAt = new Date();
    await repo.save(convocation);
    return { success: true };
  }

  async getTrainingInvitations(
    playerId: string,
  ): Promise<Array<{ invitation: TrainingInvitation; training: Training | null }>> {
    const ds = await this.ds();
    const invitations = await ds.getRepository(TrainingInvitation).find({
      where: { playerId },
      order: { createdAt: "DESC" },
    });
    const trainingIds = [...new Set(invitations.map((invitation) => invitation.trainingId))];
    const trainings = trainingIds.length
      ? await ds.getRepository(Training).find({ where: { id: In(trainingIds) } })
      : [];
    const byId = new Map(trainings.map((training) => [training.id, training]));
    return invitations.map((invitation) => ({
      invitation,
      training: byId.get(invitation.trainingId) ?? null,
    }));
  }

  async respondToTraining(
    playerId: string,
    invitationId: number,
    response: Exclude<TrainingRsvpStatus, "PENDING">,
  ): Promise<{ success: boolean; error?: string }> {
    const ds = await this.ds();
    const invitationRepo = ds.getRepository(TrainingInvitation);
    const invitation = await invitationRepo.findOne({ where: { id: invitationId, playerId } });
    if (!invitation) return { success: false, error: "not_found" };

    const training = await ds.getRepository(Training).findOne({ where: { id: invitation.trainingId } });
    if (!training) return { success: false, error: "training_not_found" };
    if (training.status === "CANCELLED") return { success: false, error: "cancelled" };

    const now = new Date();
    if (training.responseDeadline && now.getTime() > training.responseDeadline.getTime()) {
      return { success: false, error: "response_deadline_passed" };
    }

    invitation.rsvpStatus = response;
    invitation.rsvpRespondedAt = now;
    await invitationRepo.save(invitation);
    return { success: true };
  }
}
