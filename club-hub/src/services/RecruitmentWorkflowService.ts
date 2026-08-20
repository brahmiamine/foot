import { getDataSource } from "@/lib/database";
import { RecruitmentApplication, type RecruitmentApplicationStatus } from "@/entities/RecruitmentApplication";
import { RecruitmentApplicationEvent } from "@/entities/RecruitmentApplicationEvent";
import { ClubFeatureSettingsService } from "./ClubFeatureSettingsService";

export interface RecruitmentTrialData {
  scheduledAt: string;
  location: string;
  notes?: string | null;
}

const REJECTABLE_STATUSES: RecruitmentApplicationStatus[] = [
  "NEW",
  "SCOUT_APPROVED",
  "COACH_APPROVED",
  "TRIAL_SCHEDULED",
  "TRIAL_APPROVED",
  "SPORTING_DIRECTOR_APPROVED",
  "NEGOTIATION",
];

function details(value: Record<string, unknown>): string | null {
  return Object.keys(value).length > 0 ? JSON.stringify(value) : null;
}

export class RecruitmentWorkflowService {
  private async assertEnabled(teamId: string): Promise<void> {
    await new ClubFeatureSettingsService().assertEnabled(teamId, "RECRUITMENT");
  }

  private async transition(
    id: number,
    teamId: string,
    actorId: string,
    expectedStatuses: RecruitmentApplicationStatus[],
    nextStatus: RecruitmentApplicationStatus,
    transition: string,
    patch: (application: RecruitmentApplication) => Record<string, unknown> | void,
  ): Promise<RecruitmentApplication> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();

    return ds.transaction(async (manager) => {
      const applicationRepository = manager.getRepository(RecruitmentApplication);
      const eventRepository = manager.getRepository(RecruitmentApplicationEvent);
      const application = await applicationRepository.findOne({
        where: { id, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!application) throw new Error("Candidature introuvable");
      if (!expectedStatuses.includes(application.status)) {
        throw new Error(`Transition de recrutement invalide depuis ${application.status}`);
      }

      const fromStatus = application.status;
      const eventDetails = patch(application) ?? {};
      application.status = nextStatus;
      const saved = await applicationRepository.save(application);

      await eventRepository.save(
        eventRepository.create({
          teamId,
          applicationId: application.id,
          actorId,
          transition,
          fromStatus,
          toStatus: nextStatus,
          details: details(eventDetails),
        }),
      );

      return saved;
    });
  }

  async approveScout(
    id: number,
    teamId: string,
    actorId: string,
    notes?: string | null,
  ): Promise<RecruitmentApplication> {
    return this.transition(id, teamId, actorId, ["NEW"], "SCOUT_APPROVED", "SCOUT_APPROVAL", (application) => {
      const normalizedNotes = notes?.trim() || null;
      application.scoutReviewedAt = new Date();
      application.scoutReviewedBy = actorId;
      application.scoutNotes = normalizedNotes;
      return { notes: normalizedNotes };
    });
  }

  async approveCoach(
    id: number,
    teamId: string,
    actorId: string,
    notes?: string | null,
  ): Promise<RecruitmentApplication> {
    return this.transition(
      id,
      teamId,
      actorId,
      ["SCOUT_APPROVED"],
      "COACH_APPROVED",
      "COACH_APPROVAL",
      (application) => {
        const normalizedNotes = notes?.trim() || null;
        application.coachReviewedAt = new Date();
        application.coachReviewedBy = actorId;
        application.coachNotes = normalizedNotes;
        return { notes: normalizedNotes };
      },
    );
  }

  async scheduleTrial(
    id: number,
    teamId: string,
    actorId: string,
    data: RecruitmentTrialData,
  ): Promise<RecruitmentApplication> {
    const scheduledAt = new Date(data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new Error("Date d'essai invalide");
    const location = data.location.trim();
    if (!location) throw new Error("Lieu de l'essai obligatoire");

    return this.transition(
      id,
      teamId,
      actorId,
      ["COACH_APPROVED"],
      "TRIAL_SCHEDULED",
      "TRIAL_SCHEDULED",
      (application) => {
        const normalizedNotes = data.notes?.trim() || null;
        application.trialScheduledAt = scheduledAt;
        application.trialLocation = location;
        application.trialNotes = normalizedNotes;
        return { scheduledAt: scheduledAt.toISOString(), location, notes: normalizedNotes };
      },
    );
  }

  async approveTrial(
    id: number,
    teamId: string,
    actorId: string,
    evaluation?: string | null,
  ): Promise<RecruitmentApplication> {
    return this.transition(
      id,
      teamId,
      actorId,
      ["TRIAL_SCHEDULED"],
      "TRIAL_APPROVED",
      "TRIAL_APPROVAL",
      (application) => {
        const normalizedEvaluation = evaluation?.trim() || null;
        application.trialApprovedAt = new Date();
        application.trialApprovedBy = actorId;
        application.trialEvaluation = normalizedEvaluation;
        return { evaluation: normalizedEvaluation };
      },
    );
  }

  async approveSportingDirector(
    id: number,
    teamId: string,
    actorId: string,
    notes?: string | null,
  ): Promise<RecruitmentApplication> {
    return this.transition(
      id,
      teamId,
      actorId,
      ["TRIAL_APPROVED"],
      "SPORTING_DIRECTOR_APPROVED",
      "SPORTING_DIRECTOR_APPROVAL",
      (application) => {
        const normalizedNotes = notes?.trim() || null;
        application.sportingDirectorApprovedAt = new Date();
        application.sportingDirectorApprovedBy = actorId;
        application.sportingDirectorNotes = normalizedNotes;
        return { notes: normalizedNotes };
      },
    );
  }

  async startNegotiation(
    id: number,
    teamId: string,
    actorId: string,
    notes?: string | null,
  ): Promise<RecruitmentApplication> {
    return this.transition(
      id,
      teamId,
      actorId,
      ["SPORTING_DIRECTOR_APPROVED"],
      "NEGOTIATION",
      "NEGOTIATION_STARTED",
      (application) => {
        const normalizedNotes = notes?.trim() || null;
        application.negotiationStartedAt = new Date();
        application.negotiationStartedBy = actorId;
        application.negotiationNotes = normalizedNotes;
        return { notes: normalizedNotes };
      },
    );
  }

  async accept(
    id: number,
    teamId: string,
    actorId: string,
    notes?: string | null,
  ): Promise<RecruitmentApplication> {
    return this.transition(id, teamId, actorId, ["NEGOTIATION"], "ACCEPTED", "ACCEPTED", (application) => {
      const normalizedNotes = notes?.trim() || null;
      application.acceptedAt = new Date();
      application.acceptedBy = actorId;
      application.acceptanceNotes = normalizedNotes;
      return { notes: normalizedNotes };
    });
  }

  async reject(id: number, teamId: string, actorId: string, reason: string): Promise<RecruitmentApplication> {
    const rejectionReason = reason.trim();
    if (!rejectionReason) throw new Error("Motif de refus obligatoire");

    return this.transition(id, teamId, actorId, REJECTABLE_STATUSES, "REJECTED", "REJECTED", (application) => {
      application.rejectedAt = new Date();
      application.rejectedBy = actorId;
      application.rejectionReason = rejectionReason;
      return { reason: rejectionReason };
    });
  }

  async deleteNew(id: number, teamId: string): Promise<boolean> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    const repository = ds.getRepository(RecruitmentApplication);
    const application = await repository.findOne({ where: { id, teamId } });
    if (!application) throw new Error("Candidature introuvable");
    if (application.status !== "NEW") {
      throw new Error("Une candidature déjà traitée ne peut pas être supprimée");
    }
    await repository.remove(application);
    return true;
  }
}
