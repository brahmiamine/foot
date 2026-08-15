import { getDataSource } from "@/lib/database";
import { TrainingInvitation, TrainingInvitationResponse } from "@/entities/TrainingInvitation";
import { In, Repository } from "typeorm";

/** Service for TrainingInvitation operations (joueurs invités à une séance). */
export class TrainingInvitationService {
  private async getRepository(): Promise<Repository<TrainingInvitation>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TrainingInvitation);
  }

  async findByTraining(trainingId: number): Promise<TrainingInvitation[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { trainingId }, relations: ["player"], order: { createdAt: "ASC" } });
  }

  async findByTrainingIds(trainingIds: number[]): Promise<TrainingInvitation[]> {
    if (trainingIds.length === 0) return [];
    const repository = await this.getRepository();
    return repository.find({
      where: { trainingId: In(trainingIds) },
      relations: ["player"],
      order: { trainingId: "ASC", createdAt: "ASC" },
    });
  }

  async findById(id: number): Promise<TrainingInvitation | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id }, relations: ["player", "training"] });
  }

  /** Invite une liste de joueurs (ignore ceux déjà invités). */
  async inviteBulk(trainingId: number, playerIds: string[]): Promise<TrainingInvitation[]> {
    const repository = await this.getRepository();
    const existing = await repository.find({ where: { trainingId } });
    const existingPlayerIds = new Set(existing.map((invitation) => invitation.playerId));

    const toCreate = playerIds
      .filter((playerId) => !existingPlayerIds.has(playerId))
      .map((playerId) => repository.create({ trainingId, playerId, notifiedAt: new Date() }));

    if (toCreate.length === 0) return [];
    return repository.save(toCreate);
  }

  private async findByIdForTeam(id: number, teamId: string): Promise<TrainingInvitation | null> {
    const invitation = await this.findById(id);
    if (!invitation || invitation.training?.teamId !== teamId) {
      return null;
    }
    return invitation;
  }

  async updateResponse(
    id: number,
    teamId: string,
    response: TrainingInvitationResponse
  ): Promise<TrainingInvitation> {
    const repository = await this.getRepository();
    const invitation = await this.findByIdForTeam(id, teamId);
    if (!invitation) {
      throw new Error("Invitation non trouvée");
    }
    invitation.response = response;
    invitation.respondedAt = new Date();
    return repository.save(invitation);
  }

  async remove(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const invitation = await this.findByIdForTeam(id, teamId);
    if (!invitation) {
      throw new Error("Invitation non trouvée");
    }
    await repository.remove(invitation);
    return true;
  }
}
