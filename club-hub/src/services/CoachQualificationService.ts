import type { EntityManager } from "typeorm";
import { CoachQualification, CoachQualificationHistory } from "@/entities/CoachQualification";
import { Staff } from "@/entities/Staff";
import { TeamAffiliation } from "@/entities/TeamAffiliation";
import { getDataSource } from "@/lib/database";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";
import { CoachQualificationWorkflowError, type CoachQualificationType } from "../../../packages/regulatory-shared/src/coachQualification";

export interface CoachQualificationActor { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null; }
export interface CoachQualificationInput { staffId: string; qualificationType: CoachQualificationType; licenseNumber?: string | null; documentUrl?: string | null; }

async function history(manager: EntityManager, qualificationId: string, actor: CoachQualificationActor, input: { action: string; toStatus?: string | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(CoachQualificationHistory);
  await repo.save(repo.create({ qualificationId, action: input.action, toStatus: input.toStatus ?? null, actorUserId: actor.userId, actorRole: actor.role, afterValue: input.afterValue ?? null, ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent ?? null }));
}

export async function listCoachQualificationsForClub(clubId: string) {
  const dataSource = await getDataSource();
  return dataSource.getRepository(CoachQualification).find({ where: { clubId }, order: { createdAt: "DESC" } });
}

export async function submitCoachQualificationForClub(clubId: string, input: CoachQualificationInput, actor: CoachQualificationActor): Promise<CoachQualification> {
  const dataSource = await getDataSource();
  return dataSource.transaction(async (manager) => {
    const staff = await manager.getRepository(Staff).findOne({ where: { id: Number(input.staffId), teamId: clubId } });
    if (!staff) throw new CoachQualificationWorkflowError("Membre du staff introuvable dans ce club");
    const affiliation = await manager.getRepository(TeamAffiliation).findOne({ where: { teamId: clubId, status: "ACTIVE" } });
    if (!affiliation) throw new CoachQualificationWorkflowError("Aucune affiliation réglementaire active pour ce club");
    const repo = manager.getRepository(CoachQualification);
    const qualification = await repo.save(repo.create({ staffId: input.staffId, clubId, federationId: affiliation.federationId, leagueId: affiliation.leagueId ?? null, qualificationType: input.qualificationType, licenseNumber: input.licenseNumber ?? null, documentUrl: input.documentUrl ?? null, status: "PENDING", createdBy: actor.userId }));
    await history(manager, qualification.id, actor, { action: "QUALIFICATION_SUBMITTED", toStatus: "PENDING", afterValue: { staffId: input.staffId, qualificationType: input.qualificationType } });
    await new NotificationOutboxService().enqueue(manager, { eventId: `coach-qualification:${qualification.id}:SUBMITTED:${qualification.createdAt.toISOString()}`, type: "COACH_QUALIFICATION_SUBMITTED", target: { type: "ROLE", role: "FEDERATION_ADMIN" }, teamId: clubId, category: "REGULATORY", title: "Nouvelle qualification entraîneur", body: "Un club a soumis une qualification technique pour validation.", data: { qualificationId: qualification.id, staffId: input.staffId, clubId } });
    return qualification;
  });
}
