import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import { getDataSource } from "@/lib/database";
import { PlayerApplication, ApplicationStatus } from "@/entities/PlayerApplication";
import {
  PlayerApplicationEvent,
  type PlayerApplicationEventType,
} from "@/entities/PlayerApplicationEvent";
import { Player } from "@/entities/Player";
import { AGE_CATEGORIES, type AgeCategory } from "@/types/categories";
import { PLAYER_POSITIONS } from "@/types/players";
import { ClubFeatureSettingsService } from "./ClubFeatureSettingsService";

interface CreatePlayerApplicationData {
  childLastName: string;
  childFirstName: string;
  birthDate: string;
  category: string;
  position?: string | null;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  message?: string | null;
  documentUrl?: string | null;
}

export interface ScheduleAcademyTrialData {
  scheduledAt: string;
  location: string;
  notes?: string | null;
}

export interface CreatePlayerFromApplicationData {
  number: number;
  category: AgeCategory;
  position?: (typeof PLAYER_POSITIONS)[number] | null;
}

const REJECTABLE_STATUSES: ApplicationStatus[] = [
  "NEW",
  "PRE_SCREENED",
  "TRIAL_SCHEDULED",
  "TECHNICAL_APPROVED",
];

export function normalizeAcademyCategory(value: string): AgeCategory | null {
  const normalized = value.trim().toLowerCase();
  return AGE_CATEGORIES.includes(normalized as AgeCategory) ? (normalized as AgeCategory) : null;
}

/** Candidatures "Inscrire mon enfant", rattachées au module ACADEMY. */
export class PlayerApplicationService {
  private async assertEnabled(teamId: string): Promise<void> {
    await new ClubFeatureSettingsService().assertEnabled(teamId, "ACADEMY");
  }

  private async recordEvent(
    manager: EntityManager,
    application: PlayerApplication,
    actorId: string,
    eventType: PlayerApplicationEventType,
    fromStatus: ApplicationStatus,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const repository = manager.getRepository(PlayerApplicationEvent);
    await repository.save(
      repository.create({
        id: randomUUID(),
        teamId: application.teamId,
        applicationId: application.id,
        actorId,
        eventType,
        fromStatus,
        toStatus: application.status,
        detailsJson: details ? JSON.stringify(details) : null,
      }),
    );
  }

  private async mutate(
    id: number,
    teamId: string,
    actorId: string,
    expectedStatuses: ApplicationStatus[],
    nextStatus: ApplicationStatus,
    eventType: PlayerApplicationEventType,
    patch: (application: PlayerApplication) => Record<string, unknown> | void,
  ): Promise<PlayerApplication> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();

    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(PlayerApplication);
      const application = await repository.findOne({
        where: { id, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!application) throw new Error("Candidature introuvable");
      if (!expectedStatuses.includes(application.status)) {
        throw new Error(`Transition de candidature invalide depuis ${application.status}`);
      }

      const fromStatus = application.status;
      const details = patch(application) || undefined;
      application.status = nextStatus;
      const saved = await repository.save(application);
      await this.recordEvent(manager, saved, actorId, eventType, fromStatus, details);
      return saved;
    });
  }

  async findAll(teamId: string, status?: ApplicationStatus): Promise<PlayerApplication[]> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    return ds.getRepository(PlayerApplication).find({
      where: status ? { teamId, status } : { teamId },
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: number, teamId: string): Promise<PlayerApplication | null> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    return ds.getRepository(PlayerApplication).findOne({ where: { id, teamId } });
  }

  async create(teamId: string, data: CreatePlayerApplicationData): Promise<PlayerApplication> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    const repository = ds.getRepository(PlayerApplication);
    return repository.save(repository.create({ ...data, teamId, status: "NEW" }));
  }

  async preScreen(id: number, teamId: string, actorId: string, notes?: string | null): Promise<PlayerApplication> {
    return this.mutate(id, teamId, actorId, ["NEW"], "PRE_SCREENED", "PRE_SCREENED", (application) => {
      application.preScreeningNotes = notes?.trim() || null;
      application.preScreenedAt = new Date();
      application.preScreenedBy = actorId;
    });
  }

  async scheduleTrial(
    id: number,
    teamId: string,
    actorId: string,
    data: ScheduleAcademyTrialData,
  ): Promise<PlayerApplication> {
    const scheduledAt = new Date(data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new Error("Date d'essai invalide");
    const location = data.location.trim();
    if (!location) throw new Error("Lieu de l'essai obligatoire");

    return this.mutate(id, teamId, actorId, ["PRE_SCREENED"], "TRIAL_SCHEDULED", "TRIAL_SCHEDULED", (application) => {
      application.trialScheduledAt = scheduledAt;
      application.trialLocation = location;
      application.trialNotes = data.notes?.trim() || null;
      return { scheduledAt: scheduledAt.toISOString(), location };
    });
  }

  async approveTechnical(
    id: number,
    teamId: string,
    actorId: string,
    notes?: string | null,
  ): Promise<PlayerApplication> {
    return this.mutate(
      id,
      teamId,
      actorId,
      ["TRIAL_SCHEDULED"],
      "TECHNICAL_APPROVED",
      "TECHNICAL_APPROVED",
      (application) => {
        application.technicalApprovedAt = new Date();
        application.technicalApprovedBy = actorId;
        application.technicalNotes = notes?.trim() || null;
      },
    );
  }

  async approveAdministrative(
    id: number,
    teamId: string,
    actorId: string,
    notes?: string | null,
  ): Promise<PlayerApplication> {
    return this.mutate(
      id,
      teamId,
      actorId,
      ["TECHNICAL_APPROVED"],
      "ADMIN_APPROVED",
      "ADMIN_APPROVED",
      (application) => {
        application.administrativeApprovedAt = new Date();
        application.administrativeApprovedBy = actorId;
        application.administrativeNotes = notes?.trim() || null;
      },
    );
  }

  async reject(id: number, teamId: string, actorId: string, reason: string): Promise<PlayerApplication> {
    const rejectionReason = reason.trim();
    if (!rejectionReason) throw new Error("Motif de refus obligatoire");

    return this.mutate(id, teamId, actorId, REJECTABLE_STATUSES, "REJECTED", "REJECTED", (application) => {
      application.rejectedAt = new Date();
      application.rejectedBy = actorId;
      application.rejectionReason = rejectionReason;
      return { reason: rejectionReason };
    });
  }

  async createPlayer(
    id: number,
    teamId: string,
    actorId: string,
    data: CreatePlayerFromApplicationData,
  ): Promise<Player> {
    await this.assertEnabled(teamId);
    if (!Number.isInteger(data.number) || data.number < 0 || data.number > 99) {
      throw new Error("Numéro de joueur invalide");
    }
    if (!AGE_CATEGORIES.includes(data.category)) throw new Error("Catégorie joueur invalide");
    if (data.position && !PLAYER_POSITIONS.includes(data.position)) throw new Error("Poste joueur invalide");

    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const applicationRepository = manager.getRepository(PlayerApplication);
      const playerRepository = manager.getRepository(Player);
      const application = await applicationRepository.findOne({
        where: { id, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!application) throw new Error("Candidature introuvable");

      if (application.status === "PLAYER_CREATED" && application.playerId) {
        const existing = await playerRepository.findOne({ where: { id: application.playerId, teamId } });
        if (!existing) throw new Error("Candidature liée à un joueur introuvable");
        return existing;
      }

      if (application.status !== "ADMIN_APPROVED") {
        throw new Error(`Transition de candidature invalide depuis ${application.status}`);
      }

      const duplicate = await playerRepository.findOne({
        where: {
          teamId,
          firstNameFr: application.childFirstName,
          lastNameFr: application.childLastName,
          birthDate: new Date(`${application.birthDate}T00:00:00.000Z`),
        },
      });
      if (duplicate) throw new Error("Un joueur correspondant existe déjà dans ce club");

      const fromStatus = application.status;
      const player = playerRepository.create({
        id: randomUUID(),
        firstNameFr: application.childFirstName,
        lastNameFr: application.childLastName,
        firstNameAr: null,
        lastNameAr: null,
        number: data.number,
        teamId,
        category: data.category,
        status: "BLANK",
        isActive: true,
        birthDate: new Date(`${application.birthDate}T00:00:00.000Z`),
        position: data.position ?? null,
        imageUrl: null,
      });
      const savedPlayer = await playerRepository.save(player);

      application.status = "PLAYER_CREATED";
      application.playerId = savedPlayer.id;
      application.playerCreatedAt = new Date();
      application.playerCreatedBy = actorId;
      const savedApplication = await applicationRepository.save(application);
      await this.recordEvent(manager, savedApplication, actorId, "PLAYER_CREATED", fromStatus, {
        playerId: savedPlayer.id,
        category: data.category,
        number: data.number,
      });

      return savedPlayer;
    });
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    const repository = ds.getRepository(PlayerApplication);
    const application = await repository.findOne({ where: { id, teamId } });
    if (!application) throw new Error("Candidature introuvable");
    if (application.status !== "NEW") {
      throw new Error("Une candidature déjà traitée ne peut pas être supprimée");
    }
    await repository.remove(application);
    return true;
  }
}
