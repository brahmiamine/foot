import { getDataSource } from "@/lib/database";
import { Training } from "@/entities/Training";
import {
  TrainingInvitation,
  type TrainingInvitationResponse,
} from "@/entities/TrainingInvitation";
import { Player } from "@/entities/Player";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";
import { createClubIdentityAdapter } from "@/adapters/identity/createClubIdentityAdapter";
import { In, IsNull, type Repository } from "typeorm";

export interface TrainingReminderResult {
  processed: number;
}

function activePlayerUserMap(
  users: Awaited<ReturnType<ReturnType<typeof createClubIdentityAdapter>["listUsers"]>>,
): Map<string, string> {
  return new Map(
    users
      .filter((user) => user.isActive && user.playerId)
      .map((user) => [user.playerId as string, user.id]),
  );
}

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

  /**
   * Ajoute des joueurs à un roster encore mutable. L'appartenance club,
   * la catégorie et l'activité du joueur sont relues dans la transaction.
   */
  async inviteBulk(trainingId: number, teamId: string, playerIds: string[]): Promise<TrainingInvitation[]> {
    const uniquePlayerIds = [...new Set(playerIds)];
    if (uniquePlayerIds.length === 0) return [];
    const identityUsers = await createClubIdentityAdapter().listUsers({ teamId, roles: ["PLAYER"] });
    const userByPlayerId = activePlayerUserMap(identityUsers);
    const dataSource = await getDataSource();
    return dataSource.transaction(async (manager) => {
      const training = await manager.getRepository(Training).findOne({
        where: { id: trainingId, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!training) throw new Error("Entraînement non trouvé");
      if (training.status !== "SCHEDULED") throw new Error("Les invitations ne sont possibles que sur une séance planifiée");
      if (training.invitationsLocked) throw new Error("Le roster des invitations est verrouillé");

      const players = await manager.getRepository(Player).find({
        where: {
          id: In(uniquePlayerIds),
          teamId,
          category: training.category,
          isActive: true,
        },
      });
      if (players.length !== uniquePlayerIds.length) {
        throw new Error("Un ou plusieurs joueurs ne sont pas éligibles pour cette séance");
      }

      const repository = manager.getRepository(TrainingInvitation);
      const existing = await repository.find({ where: { trainingId, playerId: In(uniquePlayerIds) } });
      const existingPlayerIds = new Set(existing.map((invitation) => invitation.playerId));
      const now = new Date();
      const toCreateIds = uniquePlayerIds.filter((playerId) => !existingPlayerIds.has(playerId));
      if (toCreateIds.length === 0) return [];

      const created = await repository.save(
        toCreateIds.map((playerId) => repository.create({
          trainingId,
          playerId,
          response: "PENDING",
          rsvpStatus: "PENDING",
          notifiedAt: now,
          rsvpRespondedAt: null,
          reminderSentAt: null,
        })),
      );

      const outbox = new NotificationOutboxService();
      for (const invitation of created) {
        const userId = userByPlayerId.get(invitation.playerId);
        if (!userId) continue;
        await outbox.enqueue(manager, {
          eventId: `training-invitation:${training.id}:${invitation.playerId}`,
          type: "TRAINING_INVITATION",
          target: { type: "USER", userIds: [userId] },
          teamId,
          category: training.category,
          title: "Nouvel entraînement",
          body: `${training.title} — merci de confirmer votre disponibilité.`,
          data: {
            trainingId: training.id,
            invitationId: invitation.id,
            responseDeadline: training.responseDeadline?.toISOString() ?? null,
          },
        });
      }
      return created;
    });
  }

  private async findByIdForTeam(id: number, teamId: string): Promise<TrainingInvitation | null> {
    const invitation = await this.findById(id);
    if (!invitation || invitation.training?.teamId !== teamId) return null;
    return invitation;
  }

  /** Pointage réel staff : indépendant du RSVP joueur. */
  async updateResponse(
    id: number,
    teamId: string,
    response: TrainingInvitationResponse,
  ): Promise<TrainingInvitation> {
    const repository = await this.getRepository();
    const invitation = await this.findByIdForTeam(id, teamId);
    if (!invitation) throw new Error("Invitation non trouvée");
    invitation.response = response;
    invitation.respondedAt = new Date();
    return repository.save(invitation);
  }

  async remove(id: number, teamId: string): Promise<boolean> {
    const dataSource = await getDataSource();
    return dataSource.transaction(async (manager) => {
      const invitationRepo = manager.getRepository(TrainingInvitation);
      const invitation = await invitationRepo.findOne({ where: { id }, relations: ["training"] });
      if (!invitation || invitation.training?.teamId !== teamId) throw new Error("Invitation non trouvée");
      const training = await manager.getRepository(Training).findOne({
        where: { id: invitation.trainingId, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!training) throw new Error("Invitation non trouvée");
      if (training.invitationsLocked) throw new Error("Le roster des invitations est verrouillé");
      await invitationRepo.remove(invitation);
      return true;
    });
  }

  /**
   * Enfile un rappel unique pour les RSVP encore PENDING lorsque la fenêtre
   * `deadline - reminderOffsetMinutes` est atteinte. `reminderSentAt` et
   * l'outbox sont écrits dans la même transaction.
   */
  async processPendingReminders(now: Date = new Date()): Promise<TrainingReminderResult> {
    const dataSource = await getDataSource();
    const candidates = await dataSource.getRepository(Training)
      .createQueryBuilder("training")
      .where("training.status = :status", { status: "SCHEDULED" })
      .andWhere("training.response_deadline IS NOT NULL")
      .andWhere("training.response_deadline > :now", { now })
      .andWhere("DATE_SUB(training.response_deadline, INTERVAL training.reminder_offset_minutes MINUTE) <= :now", { now })
      .getMany();

    const identity = createClubIdentityAdapter();
    let processed = 0;
    for (const candidate of candidates) {
      const identityUsers = await identity.listUsers({ teamId: candidate.teamId, roles: ["PLAYER"] });
      const userByPlayer = activePlayerUserMap(identityUsers);
      processed += await dataSource.transaction(async (manager) => {
        const training = await manager.getRepository(Training).findOne({
          where: { id: candidate.id, teamId: candidate.teamId },
          lock: { mode: "pessimistic_write" },
        });
        if (
          !training ||
          training.status !== "SCHEDULED" ||
          !training.responseDeadline ||
          training.responseDeadline.getTime() <= now.getTime()
        ) return 0;

        const invitations = await manager.getRepository(TrainingInvitation).find({
          where: {
            trainingId: training.id,
            rsvpStatus: "PENDING",
            reminderSentAt: IsNull(),
          },
        });
        if (invitations.length === 0) return 0;
        const outbox = new NotificationOutboxService();
        let count = 0;
        for (const invitation of invitations) {
          const userId = userByPlayer.get(invitation.playerId);
          if (!userId) continue;
          await outbox.enqueue(manager, {
            eventId: `training-rsvp-reminder:${invitation.id}:${training.responseDeadline.toISOString()}`,
            type: "TRAINING_RSVP_REMINDER",
            target: { type: "USER", userIds: [userId] },
            teamId: training.teamId,
            category: training.category,
            title: "Rappel entraînement",
            body: `Merci de répondre à l'invitation « ${training.title} » avant la deadline.`,
            data: {
              trainingId: training.id,
              invitationId: invitation.id,
              responseDeadline: training.responseDeadline.toISOString(),
            },
          });
          invitation.reminderSentAt = now;
          await manager.getRepository(TrainingInvitation).save(invitation);
          count += 1;
        }
        return count;
      });
    }
    return { processed };
  }
}
