import type { EntityManager } from "typeorm";
import { MedicalEligibility, MedicalEligibilityHistory } from "@/entities/MedicalEligibility";
import { Player } from "@/entities/Player";
import { TeamAffiliation } from "@/entities/TeamAffiliation";
import { getDataSource } from "@/lib/database";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";
import { MedicalEligibilityWorkflowError } from "../../../packages/regulatory-shared/src/medicalEligibility";

export interface MedicalEligibilityActor { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null; }
export interface MedicalEligibilityInput { playerId: string; seasonId: string; examinationDate: string; certificateReference?: string | null; documentUrl?: string | null; }

async function history(manager: EntityManager, eligibilityId: string, actor: MedicalEligibilityActor, input: { action: string; fromStatus?: string | null; toStatus?: string | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(MedicalEligibilityHistory);
  await repo.save(repo.create({ eligibilityId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: actor.userId, actorRole: actor.role, afterValue: input.afterValue ?? null, ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent ?? null }));
}

export async function listMedicalEligibilitiesForClub(clubId: string) {
  const dataSource = await getDataSource();
  return dataSource.getRepository(MedicalEligibility).find({ where: { clubId }, order: { createdAt: "DESC" } });
}

/** Un seul dossier par joueur/saison : un dossier UNFIT peut être rouvert en PENDING pour une nouvelle visite médicale. */
export async function submitMedicalEligibilityForClub(clubId: string, input: MedicalEligibilityInput, actor: MedicalEligibilityActor): Promise<MedicalEligibility> {
  const dataSource = await getDataSource();
  return dataSource.transaction(async (manager) => {
    const player = await manager.getRepository(Player).findOne({ where: { id: input.playerId, teamId: clubId } });
    if (!player) throw new MedicalEligibilityWorkflowError("Joueur introuvable dans ce club");
    const affiliation = await manager.getRepository(TeamAffiliation).findOne({ where: { teamId: clubId, status: "ACTIVE" } });
    if (!affiliation) throw new MedicalEligibilityWorkflowError("Aucune affiliation réglementaire active pour ce club");
    const repo = manager.getRepository(MedicalEligibility);
    const existing = await repo.findOne({ where: { playerId: input.playerId, seasonId: input.seasonId } });
    if (existing) {
      if (existing.status !== "UNFIT") throw new MedicalEligibilityWorkflowError("Un dossier est déjà en cours pour ce joueur et cette saison");
      const previous = existing.status;
      existing.status = "PENDING";
      existing.examinationDate = input.examinationDate;
      existing.certificateReference = input.certificateReference ?? null;
      existing.documentUrl = input.documentUrl ?? null;
      await repo.save(existing);
      await history(manager, existing.id, actor, { action: "ELIGIBILITY_RESUBMITTED", fromStatus: previous, toStatus: "PENDING" });
      return existing;
    }
    const eligibility = await repo.save(repo.create({ playerId: input.playerId, clubId, seasonId: input.seasonId, federationId: affiliation.federationId, leagueId: affiliation.leagueId ?? null, examinationDate: input.examinationDate, certificateReference: input.certificateReference ?? null, documentUrl: input.documentUrl ?? null, status: "PENDING", createdBy: actor.userId }));
    await history(manager, eligibility.id, actor, { action: "ELIGIBILITY_SUBMITTED", toStatus: "PENDING", afterValue: { playerId: input.playerId, seasonId: input.seasonId } });
    await new NotificationOutboxService().enqueue(manager, { eventId: `medical-eligibility:${eligibility.id}:SUBMITTED:${eligibility.createdAt.toISOString()}`, type: "MEDICAL_ELIGIBILITY_SUBMITTED", target: { type: "ROLE", role: "FEDERATION_ADMIN" }, teamId: clubId, category: "REGULATORY", title: "Nouveau certificat médical", body: "Un club a soumis un certificat médical pour validation.", data: { eligibilityId: eligibility.id, playerId: input.playerId, clubId, seasonId: input.seasonId } });
    return eligibility;
  });
}
